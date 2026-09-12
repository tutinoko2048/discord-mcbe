import { networkInterfaces, type NetworkInterfaceInfo } from 'node:os';
import { gray, green } from 'colorette';
import {
  DisconnectReason,
  ActionId,
  type ServerBoundApplicationRequestPacket,
  type ServerBoundNotificationPacket,
} from '@discord-mcbe/shared';
import { ServerNetBridgeServer, type ISession, WebSocketBridgeServer, SocketSession } from './transport';
import { _t, Logger } from '../util';
import { WorldConnectEvent, WorldDisconnectEvent } from '../events';

import type { RawMessage } from '@minecraft/server';
import type { Application } from '../application';
import { ScriptWorld } from './bridge';

export class MinecraftHandler {
  private readonly logger: Logger;

  public readonly socket: WebSocketBridgeServer;
  public readonly script: ServerNetBridgeServer;

  public readonly worlds = new Map<ISession, ScriptWorld>();

  constructor(private readonly app: Application) {
    this.logger = new Logger('Minecraft', this.app.config);
    const handlePacket = (
      session: ISession,
      packet: ServerBoundApplicationRequestPacket | ServerBoundNotificationPacket,
    ) => this.handlePacket(session, packet);
    this.script = new ServerNetBridgeServer({
      port: this.app.env.BRIDGE_PORT,
      handlePacket,
    });
    this.socket = new WebSocketBridgeServer(
      this.app,
      {
        port: this.app.env.SOCKET_PORT,
        debug: this.app.config.debug,
        disableEncryption: this.app.config.bridge.disable_encryption,
      },
      handlePacket,
    );

    this.socket.on('clientConnect', this.onClientConnect.bind(this));
    this.script.on('clientConnect', this.onClientConnect.bind(this));
    this.socket.on('clientDisconnect', this.onClientDisconnect.bind(this));
    this.script.on('clientDisconnect', this.onClientDisconnect.bind(this));
    this.socket.on('sessionDestroy', this.onSessionDestroy.bind(this));
    this.script.on('sessionDestroy', this.onSessionDestroy.bind(this));
    this.socket.on('open', this.onOpen.bind(this));
    this.script.on('error', this.onError.bind(this));

    this.logger.debug('Initialized');
  }

  async start(): Promise<void> {
    await this.script.start();
    this.logger.info(_t('console.script.ready', this.script.port));
  }

  async stop() {
    await this.socket.server.stop();
    await this.script.stop();
  }

  getWorlds(): ScriptWorld[] {
    return Array.from(this.worlds.values());
  }

  getWorldBySession(session: ISession): ScriptWorld | undefined {
    return this.worlds.get(session);
  }

  async broadcastCommand(command: string) {
    return await Promise.allSettled(this.getWorlds().map((world) => world.runCommand(command)));
  }

  async broadcastMessage(message: string | RawMessage | (string | RawMessage)[]): Promise<void> {
    await Promise.allSettled(this.getWorlds().map((world) => world.sendMessage(message)));
  }

  private onClientConnect(session: ISession) {
    this.logger.debug('onClientConnect', session.id);
  }

  private onClientDisconnect(session: ISession, reason: DisconnectReason) {
    this.logger.debug('onClientDisconnect', session.id, DisconnectReason[reason]);
  }

  private onSessionDestroy(session: ISession) {
    this.logger.debug('onSessionDestroy', session.id);
    const world = this.worlds.get(session);
    if (!world) return;
    new WorldDisconnectEvent(this.app, world).emit();
    this.worlds.delete(session);
  }

  private onOpen() {
    this.logger.info(_t('console.socket.ready', this.app.env.SOCKET_PORT));
    this.logger.info(_t('console.socket.command'));
    this.logger.info(`  Local:   ${green(`/connect localhost:${this.app.env.SOCKET_PORT}`)}`);
    const networkCommands = getNetworkIPv4Addresses().map(({ address, interfaceName }) => ({
      command: `/connect ${address}:${this.app.env.SOCKET_PORT}`,
      interfaceName,
    }));
    const commandWidth = Math.max(0, ...networkCommands.map(({ command }) => command.length));
    for (const { command, interfaceName } of networkCommands) {
      this.logger.info(`  Network: ${green(command.padEnd(commandWidth))}  ${gray(interfaceName)}`);
    }
  }

  private onError(error: Error) {
    this.logger.error(error);
  }

  private handlePacket(
    session: ISession,
    packet: ServerBoundApplicationRequestPacket | ServerBoundNotificationPacket,
  ): null {
    switch (packet.type) {
      case ActionId.WorldInitialize: {
        const world = new ScriptWorld(this.app, session, session instanceof SocketSession);
        this.worlds.set(session, world);
        world.onInitialize(packet.data);
        new WorldConnectEvent(this.app, world).emit();
        return null;
      }

      case ActionId.PlayerJoin: {
        const world = this.getWorldBySession(session);
        if (!world) throw new Error(`World not found: ${session.id}`);
        world.onPlayerJoin(packet.data.player);
        return null;
      }

      case ActionId.PlayerLeave: {
        const world = this.getWorldBySession(session);
        if (!world) throw new Error(`World not found: ${session.id}`);
        world.onPlayerLeave(packet.data.playerUniqueId);
        return null;
      }

      case ActionId.PlayerDie: {
        const world = this.getWorldBySession(session);
        if (!world) throw new Error(`World not found: ${session.id}`);
        world.onPlayerDie(packet.data.playerUniqueId, packet.data.cause, packet.data.damagingEntity);
        return null;
      }

      case ActionId.ChatSend: {
        const world = this.getWorldBySession(session);
        if (!world) throw new Error(`World not found: ${session.id}`);
        world.onChatSend(packet.data.senderUniqueId, packet.data.message);
        return null;
      }

      case ActionId.DiscordSend: {
        if (!this.app.config.bot.allow_addon_messages) return null;
        const world = this.getWorldBySession(session);
        if (!world) throw new Error(`World not found: ${session.id}`);
        void this.app.bot
          .sendMessage({ content: packet.data.message })
          .catch((error) => this.logger.error(`Failed to send IPC message from ${world.name}:`, error));
        return null;
      }

      default:
        return assertNever(packet);
    }
  }
}

export function getNetworkIPv4Addresses(
  interfaces: Record<
    string,
    Pick<NetworkInterfaceInfo, 'address' | 'family' | 'internal'>[] | undefined
  > = networkInterfaces(),
): { address: string; interfaceName: string }[] {
  const addresses = new Map<string, string>();
  for (const [interfaceName, entries] of Object.entries(interfaces)) {
    for (const { address, family, internal } of entries ?? []) {
      if (family === 'IPv4' && !internal && !addresses.has(address)) addresses.set(address, interfaceName);
    }
  }
  return [...addresses].map(([address, interfaceName]) => ({ address, interfaceName }));
}

function assertNever(value: never): never {
  throw new Error(`Unsupported server-bound packet: ${String(value)}`);
}
