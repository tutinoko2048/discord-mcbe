import { Player, world } from '@minecraft/server';
import { createSync, type SyncNode } from '@bedrock-core/sync';
import { IPC, PROTO } from 'mcbe-ipc';
import {
  ActionId,
  ADDON_PROTOCOL_VERSION,
  AddonFeature,
  AddonIpc,
  AddonSync,
  safeParseAddonChatSend,
  safeParseAddonRegisterRequest,
  safeParseAddonSendMessage,
  VERSION,
  type AddonChatSend,
  type AddonDiscordChat,
  type AddonRegisterResponse,
  type ChatFormatting,
  type DiscordMessageJSON,
  type ServerSettings,
  type UniqueId,
} from '@discord-mcbe/shared';

import type { IBridgeClient } from '../../transport/interfaces';
import type { Logger } from '../../utils';

const SUPPORTED_FEATURES: ReadonlySet<string> = new Set(Object.values(AddonFeature));

/** What carries messages between an add-on and discord-mcbe. Notifications go back through the same one. */
type Provider = 'mcbe-ipc' | 'bedrock-core';

interface Registration {
  readonly features: ReadonlySet<AddonFeature>;
  readonly provider: Provider;
}

function parseJson(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}

/** Reads the name decoration the game itself shows for a player's chat. */
export function getPlayerChatFormatting(player: Player): ChatFormatting | undefined {
  // `message` of chatSend events already contains `chatMessagePrefix`, so only the name is decorated here.
  const { chatNamePrefix: namePrefix, chatNameSuffix: nameSuffix } = player;
  if (namePrefix === undefined && nameSuffix === undefined) return undefined;
  return { namePrefix, nameSuffix };
}

/**
 * Entry points other add-ons use to work with discord-mcbe.
 *
 * The same handlers serve both MCBE-IPC and `@bedrock-core/sync`: they take already-decoded
 * payloads and the name of the add-on that sent them. Only {@link AddonIntegration.registerIpc},
 * {@link AddonIntegration.startSync} and the notifications know how a payload travels.
 */
export class AddonIntegration {
  private readonly registrations = new Map<string, Registration>();
  private serverSettings: ServerSettings | undefined;
  private sync: SyncNode | undefined;

  constructor(
    private readonly bridge: IBridgeClient,
    private readonly logger: Logger,
  ) {
    this.registerIpc();
    // The sync node reads the game clock and sends script events, which is not possible before the world loads.
    world.afterEvents.worldLoad.subscribe(() => this.startSync());
  }

  private get isConnected(): boolean {
    return this.bridge.isConnected;
  }

  private registerIpc(): void {
    IPC.handle(AddonIpc.Channel.Ping, PROTO.Void, PROTO.Boolean, () => this.isConnected);

    IPC.handle(AddonIpc.Channel.Register, PROTO.String, PROTO.String, (json) => {
      const request = AddonIpc.safeParseRegisterRequest(parseJson(json));
      const features = request.success
        ? this.register(request.output.source, request.output.features, 'mcbe-ipc')
        : [];
      return JSON.stringify(this.registerResponse(features));
    });

    IPC.on(AddonIpc.Channel.ChatSend, PROTO.String, (json) => {
      const chat = AddonIpc.safeParseChatSend(parseJson(json));
      if (chat.success) this.onChatSend(chat.output.source, chat.output);
    });

    IPC.on(AddonIpc.Channel.SendMessage, PROTO.String, (json) => {
      const request = AddonIpc.safeParseSendMessage(parseJson(json));
      if (request.success) this.sendMessage(request.output.source, request.output.message);
    });
  }

  private startSync(): void {
    const sync = createSync({
      id: AddonSync.NODE_ID,
      version: VERSION,
      meta: { protocol: ADDON_PROTOCOL_VERSION },
    });
    this.sync = sync;

    // A request that does not fit the schema is the caller's mistake, so it is rejected instead of ignored.
    sync.rpc.onRequest(AddonSync.Method.Register, (params, from) => {
      const request = safeParseAddonRegisterRequest(params);
      if (!request.success) throw new Error('Invalid register request');
      return this.registerResponse(this.register(from, request.output.features, 'bedrock-core'));
    });

    sync.rpc.onRequest(AddonSync.Method.ChatSend, (params, from) => {
      const chat = safeParseAddonChatSend(params);
      if (!chat.success) throw new Error('Invalid chatSend request');
      return this.onChatSend(from, chat.output);
    });

    sync.rpc.onRequest(AddonSync.Method.SendMessage, (params, from) => {
      const request = safeParseAddonSendMessage(params);
      if (!request.success) throw new Error('Invalid sendMessage request');
      return this.sendMessage(from, request.output.message);
    });

    // An add-on that left the world can no longer display or report chat.
    sync.discovery.onPeerDown((peer) => {
      if (this.registrations.get(peer.id)?.provider !== 'bedrock-core') return;
      this.registrations.delete(peer.id);
      this.logger.info(`Add-on unregistered: ${peer.id}`);
    });

    sync.start();
    sync.state.set(AddonSync.NODE_ID, AddonSync.StateKey.Connected, this.isConnected);
  }

  /** Tells other add-ons that the connection to the server has started. */
  notifyConnect(): void {
    IPC.send(AddonIpc.Channel.Connect, PROTO.Void, undefined);
    this.sync?.state.set(AddonSync.NODE_ID, AddonSync.StateKey.Connected, true);
    this.sync?.events.emit(AddonSync.Event.Connect);
  }

  /** Tells other add-ons that the connection to the server has ended. */
  notifyDisconnect(): void {
    this.serverSettings = undefined;
    IPC.send(AddonIpc.Channel.Disconnect, PROTO.Void, undefined);
    this.sync?.state.set(AddonSync.NODE_ID, AddonSync.StateKey.Connected, false);
    this.sync?.events.emit(AddonSync.Event.Disconnect);
  }

  setServerSettings(settings: ServerSettings): void {
    this.serverSettings = settings;
  }

  /**
   * Whether a registered add-on reports Minecraft chat in place of discord-mcbe.
   * Stays false until the server confirms it accepts messages from add-ons.
   */
  get isMinecraftChatDelegated(): boolean {
    return this.isAllowed && this.sourcesWith(AddonFeature.MinecraftChat).length > 0;
  }

  /**
   * Hands a chat message relayed from Discord to the add-on that registered to display it.
   * Returns false when no add-on takes it, so the caller displays it itself.
   */
  deliverDiscordChat(payload: AddonDiscordChat): boolean {
    if (!this.isAllowed) return false;

    // Both providers reach every add-on, so each is used only when one of its add-ons displays the chat.
    const providers = new Set(
      this.sourcesWith(AddonFeature.DiscordChat).map((source) => this.registrations.get(source)!.provider),
    );
    if (providers.has('mcbe-ipc'))
      IPC.send(AddonIpc.Channel.DiscordChat, PROTO.String, JSON.stringify(payload));
    if (providers.has('bedrock-core')) this.sync?.events.emit(AddonSync.Event.DiscordChat, payload);
    return providers.size > 0;
  }

  private get isAllowed(): boolean {
    return !!this.serverSettings?.allowAddonMessages;
  }

  private sourcesWith(feature: AddonFeature): string[] {
    return [...this.registrations]
      .filter(([, registration]) => registration.features.has(feature))
      .map(([source]) => source);
  }

  private registerResponse(features: AddonFeature[]): AddonRegisterResponse {
    return { protocol: ADDON_PROTOCOL_VERSION, connected: this.isConnected, features };
  }

  /** Returns the requested features discord-mcbe accepted. */
  private register(source: string, requested: readonly string[], provider: Provider): AddonFeature[] {
    const features = new Set(
      requested.filter((feature): feature is AddonFeature => SUPPORTED_FEATURES.has(feature)),
    );
    this.registrations.set(source, { features, provider });
    this.logger.info(
      `Add-on registered: ${source} (${[...features].join(', ') || 'no features'}, ${provider})`,
    );

    // Every registered add-on receives the relayed chat, so two of them would display it twice.
    const displays = this.sourcesWith(AddonFeature.DiscordChat);
    if (features.has(AddonFeature.DiscordChat) && displays.length > 1) {
      this.logger.warn(`Discord chat will be displayed more than once: ${displays.join(', ')}`);
    }
    return [...features];
  }

  /** Returns whether the chat was passed on to the server. */
  private onChatSend(source: string, chat: AddonChatSend): boolean {
    if (!this.isConnected) return false;

    const registration = this.registrations.get(source);
    if (!registration?.features.has(AddonFeature.MinecraftChat)) return false;

    const sender = world.getEntity(chat.playerId);
    if (!(sender instanceof Player)) return false;

    this.bridge.notify({
      type: ActionId.ChatSend,
      data: {
        senderName: sender.name,
        senderUniqueId: sender.id as UniqueId,
        message: chat.message,
        formatting: chat.formatting,
        source,
      },
    });
    return true;
  }

  /** Returns whether the message was passed on to the server. */
  private sendMessage(source: string, message: DiscordMessageJSON): boolean {
    if (!this.isConnected) return false;

    this.bridge.notify({ type: ActionId.DiscordSend, data: { source, message } });
    return true;
  }
}
