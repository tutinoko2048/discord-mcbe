import { Server, ServerEvent, Server as SocketServer, World as SocketWorld } from 'socket-be';
import { BridgeServer, ScriptWorld } from '../../bridge';
import { Application } from '../../main';
import { Logger } from '../../util';
import { PlayerChatEvent, PlayerJoinEvent, PlayerLeaveEvent } from '../../events';
import { createPlayer, createWorld } from './models';

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

    this.socket.on(ServerEvent.PlayerChat, (ev) => {
      new PlayerChatEvent(
        this.app,
        createWorld(ev.world),
        createPlayer(ev.sender),
        ev.message
      ).emit();
    });

    this.socket.on(ServerEvent.PlayerJoin, (ev) => {
      new PlayerJoinEvent(
        this.app,
        createWorld(ev.world),
        createPlayer(ev.player)
      ).emit();
    });

    this.socket.on(ServerEvent.PlayerLeave, (ev) => {
      new PlayerLeaveEvent(
        this.app,
        createWorld(ev.world),
        createPlayer(ev.player)
      ).emit();
    });
    
    this.logger.debug('Initialized');
  }

  async start(): Promise<void> {
    await this.bridge.start();
    this.logger.info('Bridge server is listening on port', this.bridge.server.port);
  }

  getWorlds(): (SocketWorld | ScriptWorld)[] {
    return [
      ...this.socket.getWorlds(),
      ...this.bridge.getWorlds()
    ];
  }

  async broadcastCommand(command: string): Promise<void> {
    const worlds = [...this.bridge.getWorlds(), ...this.socket.getWorlds()];
    await Promise.all(
      worlds.map(world => world.runCommand(command))
    );
  }
}