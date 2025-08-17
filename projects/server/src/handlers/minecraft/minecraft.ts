import { Player as SocketPlayer, ServerEvent, Server as SocketServer, World as SocketWorld } from 'socket-be';
import type { RawMessage } from '@minecraft/server';
import { BridgeServer, ScriptPlayer, ScriptWorld } from '../../bridge';
import type { Application } from '../../main';
import { Logger } from '../../util';
import {
  ConnectEvent,
  DisconnectEvent,
  PlayerChatEvent,
  PlayerJoinEvent,
  PlayerLeaveEvent,
} from '../../events';
import { createPlayer, createWorld, type IWorld } from './models';

export class MinecraftHandler {
  private readonly logger: Logger;

  public readonly socket: SocketServer;

  public readonly bridge: BridgeServer;

  constructor(private readonly app: Application) {
    this.logger = new Logger('Minecraft', this.app.config);
    this.socket = new SocketServer({
      port: this.app.config.port,
      commandVersion: this.app.config.command_version,
      debug: this.app.config.debug,
      disableEncryption: this.app.config.disable_encryption,
    });
    this.bridge = new BridgeServer(app);

    this.socket.on(ServerEvent.Open, () => {
      this.logger.info('WebSocket server is listening on port', this.socket.options.port);
    });

    this.socket.on(ServerEvent.WorldInitialize, (ev) => this.onConnect(ev.world));

    this.socket.on(ServerEvent.WorldRemove, (ev) => this.onDisconnect(ev.world));

    this.socket.on(ServerEvent.PlayerChat, (ev) => this.onPlayerChat(ev.world, ev.sender, ev.message));

    this.socket.on(ServerEvent.PlayerLoad, (ev) => this.onPlayerJoin(ev.world, ev.player));

    this.socket.on(ServerEvent.PlayerLeave, (ev) => this.onPlayerLeave(ev.world, ev.player));

    this.logger.debug('Initialized');
  }

  async start(): Promise<void> {
    await this.bridge.start();
    this.logger.info('Bridge server is listening on port', this.bridge.server.port);
  }

  getWorlds(): IWorld[] {
    return [...this.socket.getWorlds(), ...this.bridge.getWorlds()].map(createWorld);
  }

  async broadcastCommand(command: string) {
    return await Promise.allSettled(this.getWorlds().map((world) => world.runCommand(command)));
  }

  async broadcastMessage(message: string | RawMessage | (string | RawMessage)[]): Promise<void> {
    await Promise.allSettled(this.getWorlds().map((world) => world.sendMessage(message)));
  }

  onConnect(world: SocketWorld | ScriptWorld) {
    this.logger.debug(`[Connect] ${world.name} connected`);

    new ConnectEvent(this.app, createWorld(world)).emit();
  }

  onDisconnect(world: SocketWorld | ScriptWorld, reason?: string) {
    this.logger.debug(`[Disconnect] ${world.name} disconnected`);

    new DisconnectEvent(this.app, createWorld(world), reason).emit();
  }

  onPlayerJoin(world: SocketWorld | ScriptWorld, player: SocketPlayer | ScriptPlayer) {
    this.logger.debug(`[PlayerJoin] ${player.name} joined ${world.name}`);

    new PlayerJoinEvent(this.app, createWorld(world), createPlayer(player)).emit();
  }

  onPlayerLeave(world: SocketWorld | ScriptWorld, player: SocketPlayer | ScriptPlayer) {
    this.logger.debug(`[PlayerLeave] ${player.name} left ${world.name}`);

    new PlayerLeaveEvent(this.app, createWorld(world), createPlayer(player)).emit();
  }

  onPlayerChat(world: SocketWorld | ScriptWorld, sender: SocketPlayer | ScriptPlayer, message: string) {
    this.logger.debug(`[PlayerChat] [${world.name}] <${sender.name}> ${message}`);

    const event = new PlayerChatEvent(this.app, createWorld(world), createPlayer(sender), message);
    if (!event.emit()) return;

    // send to discord
    const worlds = this.getWorlds();
    this.app.bot
      .sendMessage(`${worlds.length > 1 ? `[${world.name}] ` : ''}**${sender.name}**: ${message}`)
      .catch((err) => this.logger.error(`[PlayerChat] [${world.name}] <${sender.name}> ${message}`, err));
  }
}
