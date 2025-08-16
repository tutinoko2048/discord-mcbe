import { ServerEvent, Server as SocketServer } from 'socket-be';
import type { RawMessage } from '@minecraft/server';
import { BridgeServer } from '../../bridge';
import { Application } from '../../main';
import { Logger } from '../../util';
import { PlayerChatEvent, PlayerJoinEvent, PlayerLeaveEvent } from '../../events';
import { createPlayer, createWorld, IWorld } from './models';

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

    this.socket.on(ServerEvent.WorldInitialize, (ev) => {
      this.logger.debug(`[WorldInitialize] ${ev.world.name} initialized`);
    });

    this.socket.on(ServerEvent.PlayerChat, (ev) => {
      new PlayerChatEvent(
        this.app,
        createWorld(ev.world),
        createPlayer(ev.sender),
        ev.message,
      ).emit();
    });

    this.socket.on(ServerEvent.PlayerJoin, (ev) => {
      this.logger.debug(`[PlayerJoin] ${ev.player.name} joined ${ev.world.name}`);
      new PlayerJoinEvent(this.app, createWorld(ev.world), createPlayer(ev.player)).emit();
    });

    this.socket.on(ServerEvent.PlayerLeave, (ev) => {
      this.logger.debug(`[PlayerLeave] ${ev.player.name} left ${ev.world.name}`);
      new PlayerLeaveEvent(this.app, createWorld(ev.world), createPlayer(ev.player)).emit();
    });

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
}
