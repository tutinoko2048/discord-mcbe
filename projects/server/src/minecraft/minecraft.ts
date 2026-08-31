import { green } from 'colorette';
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
    this.logger.info(_t('console.socket.command', green(`/connect localhost:${this.app.env.SOCKET_PORT}`)));
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

      default:
        return assertNever(packet);
    }
  }
}

function assertNever(value: never): never {
  throw new Error(`Unsupported server-bound packet: ${String(value)}`);
}
