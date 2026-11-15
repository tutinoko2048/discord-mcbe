import { Player, world } from '@minecraft/server';
import { IPC, PROTO } from 'mcbe-ipc';
import {
  ActionId,
  ADDON_PROTOCOL_VERSION,
  AddonChannel,
  AddonFeature,
  safeParseAddonChatSend,
  safeParseAddonRegisterRequest,
  safeParseAddonSendMessage,
  type AddonRegisterResponse,
  type ChatFormatting,
  type ServerSettings,
  type UniqueId,
} from '@discord-mcbe/shared';

import type { IBridgeClient } from '../../transport/interfaces';
import type { Logger } from '../../utils';

const SUPPORTED_FEATURES: ReadonlySet<string> = new Set(Object.values(AddonFeature));

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
 * The handlers take already-decoded payloads and do not depend on how they were delivered.
 * Only {@link AddonIntegration.registerIpc} and the connection notifications know about MCBE-IPC.
 */
export class AddonIntegration {
  private readonly registrations = new Map<string, ReadonlySet<AddonFeature>>();
  private serverSettings: ServerSettings | undefined;

  constructor(
    private readonly bridge: IBridgeClient,
    private readonly logger: Logger,
  ) {
    this.registerIpc();
  }

  private get isConnected(): boolean {
    return this.bridge.isConnected;
  }

  private registerIpc(): void {
    IPC.handle(AddonChannel.Ping, PROTO.Void, PROTO.Boolean, () => this.isConnected);

    IPC.handle(AddonChannel.Register, PROTO.String, PROTO.String, (json) =>
      JSON.stringify(this.register(parseJson(json))),
    );

    IPC.on(AddonChannel.ChatSend, PROTO.String, (json) => this.onChatSend(parseJson(json)));

    IPC.on(AddonChannel.SendMessage, PROTO.String, (json) => this.sendMessage(parseJson(json)));
  }

  /** Tells other add-ons that the connection to the server has started. */
  notifyConnect(): void {
    IPC.send(AddonChannel.Connect, PROTO.Void, undefined);
  }

  /** Tells other add-ons that the connection to the server has ended. */
  notifyDisconnect(): void {
    this.serverSettings = undefined;
    IPC.send(AddonChannel.Disconnect, PROTO.Void, undefined);
  }

  setServerSettings(settings: ServerSettings): void {
    this.serverSettings = settings;
  }

  /**
   * Whether a registered add-on reports Minecraft chat in place of discord-mcbe.
   * Stays false until the server confirms it accepts messages from add-ons.
   */
  get isMinecraftChatDelegated(): boolean {
    if (!this.serverSettings?.allowAddonMessages) return false;
    for (const features of this.registrations.values()) {
      if (features.has(AddonFeature.MinecraftChat)) return true;
    }
    return false;
  }

  private register(payload: unknown): AddonRegisterResponse {
    const features = this.acceptRegistration(payload);
    return { protocol: ADDON_PROTOCOL_VERSION, connected: this.isConnected, features };
  }

  private acceptRegistration(payload: unknown): AddonFeature[] {
    const request = safeParseAddonRegisterRequest(payload);
    if (!request.success) return [];

    const { source, features } = request.output;
    const accepted = new Set(
      features.filter((feature): feature is AddonFeature => SUPPORTED_FEATURES.has(feature)),
    );
    this.registrations.set(source, accepted);
    this.logger.info(`Add-on registered: ${source} (${[...accepted].join(', ') || 'no features'})`);
    return [...accepted];
  }

  private onChatSend(payload: unknown): void {
    if (!this.isConnected) return;

    const chat = safeParseAddonChatSend(payload);
    if (!chat.success) return;

    const { source, playerId, message, formatting } = chat.output;
    if (!this.registrations.get(source)?.has(AddonFeature.MinecraftChat)) return;

    const sender = world.getEntity(playerId);
    if (!(sender instanceof Player)) return;

    this.bridge.notify({
      type: ActionId.ChatSend,
      data: {
        senderName: sender.name,
        senderUniqueId: sender.id as UniqueId,
        message,
        formatting,
        source,
      },
    });
  }

  private sendMessage(payload: unknown): void {
    if (!this.isConnected) return;

    const request = safeParseAddonSendMessage(payload);
    if (!request.success) return;

    const { source, message } = request.output;
    this.bridge.notify({ type: ActionId.DiscordSend, data: { source, message } });
  }
}
