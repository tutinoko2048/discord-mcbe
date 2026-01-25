import { ScriptBridgeServer } from '@script-bridge/server';
import { green } from 'colorette';
import { type BaseAction, DisconnectReason } from '@script-bridge/protocol';
import {
  ActionId,
  type ChatSendAction,
  type PlayerJoinAction,
  type PlayerLeaveAction,
  type WorldInitializeAction,
} from '@discord-mcbe/shared';
import { ScriptWorld, type ClientActionHandler, type ISession, SocketBridgeServer, SocketSession } from './bridge';
import { _t, Logger } from '../util';
import { WorldConnectEvent, WorldDisconnectEvent } from '../events';

import type { RawMessage } from '@minecraft/server';
import type { Application } from '../application';

export class MinecraftHandler {
  private readonly logger: Logger;

  public readonly socket: SocketBridgeServer;
  public readonly script: ScriptBridgeServer;

  public readonly worlds = new Map<ISession, ScriptWorld>();

  constructor(private readonly app: Application) {
    this.logger = new Logger('Minecraft', this.app.config);
    this.script = new ScriptBridgeServer({
      port: this.app.env.BRIDGE_PORT,
      timeoutThresholdMultiplier: 10,
    });
    this.socket = new SocketBridgeServer({
      port: this.app.env.SOCKET_PORT,
      commandVersion: this.app.config.command_version,
      debug: this.app.config.debug,
      disableEncryption: this.app.config.disable_encryption,
    });

    this.socket.on('clientConnect', this.onClientConnect.bind(this));
    this.script.on('clientConnect', this.onClientConnect.bind(this));
    this.socket.on('clientDisconnect', this.onClientDisconnect.bind(this));
    this.script.on('clientDisconnect', this.onClientDisconnect.bind(this));
    this.socket.on('sessionDestroy', this.onSessionDestroy.bind(this));
    this.script.on('sessionDestroy', this.onSessionDestroy.bind(this));
    this.socket.on('open', this.onOpen.bind(this));
    this.script.on('error', this.onError.bind(this));

    this.registerHandler<WorldInitializeAction>(ActionId.WorldInitialize, (action) => {
      const world = new ScriptWorld(this.app, action.session, action.session instanceof SocketSession);
      this.worlds.set(action.session, world);
      world.onInitialize(action.data);
      new WorldConnectEvent(this.app, world).emit();
      action.respond();
    });

    this.registerHandler<PlayerJoinAction>(ActionId.PlayerJoin, (action) => {
      const world = this.getWorldBySession(action.session);
      if (!world) throw new Error(`World not found: ${action.session.id}`);
      world.onPlayerJoin(action.data.player);
      action.respond();
    });

    this.registerHandler<PlayerLeaveAction>(ActionId.PlayerLeave, (action) => {
      const world = this.getWorldBySession(action.session);
      if (!world) throw new Error(`World not found: ${action.session.id}`);
      world.onPlayerLeave(action.data.playerUniqueId);
      action.respond();
    });

    this.registerHandler<ChatSendAction>(ActionId.ChatSend, (action) => {
      const world = this.getWorldBySession(action.session);
      if (!world) throw new Error(`World not found: ${action.session.id}`);
      const { senderUniqueId, message } = action.data;
      world.onChatSend(senderUniqueId, message);
      action.respond();
    });

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

  registerHandler<A extends BaseAction>(channelId: A['id'], handler: ClientActionHandler<A>): void {
    this.script.registerHandler(channelId, handler);
    this.socket.registerHandler(channelId, handler);
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
    if (!world) throw new Error(`World not found: ${session.id}`);
    new WorldDisconnectEvent(this.app, world).emit();
    this.worlds.delete(session);
  }

  private onOpen() {
    this.logger.info(_t('console.socket.ready', this.app.env.SOCKET_PORT));
    this.logger.info(
      _t('console.socket.command', green(`/connect localhost:${this.app.env.SOCKET_PORT}`)),
    );
  }

  private onError(error: Error) {
    this.logger.error(error);
  }
}
