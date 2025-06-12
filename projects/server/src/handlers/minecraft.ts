import { ServerEvent, Server as SocketBEServer, World } from 'socket-be';
import { BridgeServer, ScriptWorld } from '../bridge';
import { Application } from '../main';
import { Logger } from '../util';

export class MinecraftHandler {
  private readonly logger: Logger;
  
  public readonly socket: SocketBEServer;

  public readonly bridge: BridgeServer;

  constructor(private readonly app: Application) {
    this.logger = new Logger('Minecraft', this.app.config);
    this.socket = new SocketBEServer({
      port: this.app.config.port,
      commandVersion: this.app.config.command_version,
      debug: this.app.config.debug,
      disableEncryption: this.app.config.disable_encryption,
    });
    this.bridge = new BridgeServer(app);

    this.socket.on(ServerEvent.Open, () => {
      this.logger.info('WebSocket server is listening on port', this.socket.options.port);
    });
    
    this.logger.debug('Initialized');
  }

  async start(): Promise<void> {
    await this.bridge.start();
    this.logger.info('Bridge server is listening on port', this.bridge.server.port);
  }

  getWorlds(): (World | ScriptWorld)[] {
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