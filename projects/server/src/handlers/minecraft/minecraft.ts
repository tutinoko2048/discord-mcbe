import type { RawMessage } from '@minecraft/server';
import { ScriptWorld, ClientActionHandler, ISession, SocketBridgeServer, SocketSession } from '../../bridge';
import type { Application } from '../../main';
import { Logger } from '../../util';
import { WorldConnectEvent, WorldDisconnectEvent, StartupEvent } from '../../events';
import { ScriptBridgeServer } from '@script-bridge/server';
import {
  ActionId,
  ChatSendAction,
  PlayerJoinAction,
  PlayerLeaveAction,
  WorldInitializeAction,
} from '@discord-mcbe/shared';
import { BaseAction, DisconnectReason } from '@script-bridge/protocol';
import { green } from 'colorette';

export class MinecraftHandler {
  private readonly logger: Logger;

  public readonly socket: SocketBridgeServer;
  public readonly script: ScriptBridgeServer;

  public readonly worlds = new Map<ISession, ScriptWorld>();

  constructor(private readonly app: Application) {
    this.logger = new Logger('Minecraft', this.app.config);
    this.script = new ScriptBridgeServer({
      port: this.app.config.bridge_port,
      timeoutThresholdMultiplier: 10,
    });
    this.socket = new SocketBridgeServer({
      port: this.app.config.socket_port,
      commandVersion: this.app.config.command_version,
      debug: this.app.config.debug,
      disableEncryption: this.app.config.disable_encryption,
    });

    this.socket.on('clientConnect', this.onClientConnect.bind(this));
    this.socket.on('clientDisconnect', this.onClientDisconnect.bind(this));
    this.socket.on('sessionDestroy', this.onSessionDestroy.bind(this));
    this.script.on('clientConnect', this.onClientConnect.bind(this));
    this.script.on('clientDisconnect', this.onClientDisconnect.bind(this));
    this.script.on('sessionDestroy', this.onSessionDestroy.bind(this));
    this.socket.on('open', this.onOpen.bind(this));
    this.script.on('error', this.onError.bind(this));

    this.registerHandler<WorldInitializeAction>(ActionId.WorldInitialize, (action) => {
      const world = this.getWorldBySession(action.session);
      if (!world) throw new Error(`World not found: ${action.session.id}`);
      world.onInitialize(action.data);
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

    new StartupEvent(this.app).emit();
  }

  async start(): Promise<void> {
    await this.script.start();
    this.logger.info(`[BDS] ScriptBridge server is listening on port: ${this.script.port}`);
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

  // onPlayerJoin(world: SocketWorld | ScriptWorld, player: SocketPlayer | ScriptPlayer) {
  //   this.logger.debug(`[PlayerJoin] ${player.name} joined ${world.name}`);

  //   new PlayerJoinEvent(this.app, createWorld(world), createPlayer(player)).emit();
  // }

  // onPlayerLeave(world: SocketWorld | ScriptWorld, player: SocketPlayer | ScriptPlayer) {
  //   this.logger.debug(`[PlayerLeave] ${player.name} left ${world.name}`);

  //   new PlayerLeaveEvent(this.app, createWorld(world), createPlayer(player)).emit();
  // }

  // onPlayerChat(world: SocketWorld | ScriptWorld, sender: SocketPlayer | ScriptPlayer, message: string) {
  //   this.logger.debug(`[PlayerChat] [${world.name}] <${sender.name}> ${message}`);

  //   const event = new PlayerChatEvent(this.app, createWorld(world), createPlayer(sender), message);
  //   if (!event.emit()) return;

  //   // send to discord
  //   const worlds = this.getWorlds();
  //   this.app.bot
  //     .sendMessage(`${worlds.length > 1 ? `[${world.name}] ` : ''}**${sender.name}**: ${message}`)
  //     .catch((err) => this.logger.error(`[PlayerChat] [${world.name}] <${sender.name}> ${message}`, err));
  // }

  private onClientConnect(session: ISession) {
    this.logger.debug('onClientConnect');
    const world = new ScriptWorld(this.app, session, session instanceof SocketSession);
    this.worlds.set(session, world);
    const signal = new WorldConnectEvent(this.app, world);
    if (!signal.emit()) {
      void world.disconnect();
    }
  }

  private onClientDisconnect(session: ISession, reason: DisconnectReason) {
    this.logger.debug('onClientDisconnect');
    const world = this.worlds.get(session)!;
    new WorldDisconnectEvent(this.app, world, reason).emit();
  }

  private onSessionDestroy(session: ISession) {
    this.logger.debug('onSessionDestroy');
    this.worlds.delete(session);
  }

  private onOpen() {
    this.logger.info(`[Local] SocketBridge server is listening on port: ${this.app.config.socket_port}`);
    this.logger.info(
      `[Local] Type ${green(`/connect localhost:${this.app.config.socket_port}`)} in Minecraft to connect.`,
    );
  }

  private onError(error: Error) {
    this.logger.error(error);
  }
}
