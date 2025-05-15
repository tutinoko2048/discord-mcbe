import { ScriptBridgeServer, Session } from '@script-bridge/server';
import { DisconnectReason } from '@script-bridge/protocol';
import { App } from '../main';
import { ScriptWorld } from './world';
import { Logger } from '../util';

type ServerOptions = ConstructorParameters<typeof ScriptBridgeServer>[0];

export const BRIDGE_PORT = 23191; 

/** ScriptBridge wrapper */
export class BridgeServer {
  private readonly logger: Logger;
  public readonly server: ScriptBridgeServer;

  public readonly worlds = new Map<Session, ScriptWorld>();

  constructor(private readonly app: App) {
    this.logger = new Logger('BridgeServer', this.app.config);
    this.server = new ScriptBridgeServer({ port: BRIDGE_PORT });

    this.server.on('clientConnect', this.onClientConnect.bind(this));
    this.server.on('clientDisconnect', this.onClientDisconnect.bind(this));
    this.server.on('error', this.onError.bind(this));
  }

  getWorlds(): ScriptWorld[] {
    return Array.from(this.worlds.values());
  }

  getWorldBySession(session: Session): ScriptWorld | undefined {
    return this.worlds.get(session);
  }

  private onClientConnect(session: Session) {
    const world = new ScriptWorld(this, session);
    this.worlds.set(session, world);
  }

  private onClientDisconnect(session: Session, reason: DisconnectReason) {
    this.worlds.delete(session);
    this.logger.debug(`Client disconnected: ${session.id} (${DisconnectReason[reason]})`);
  }

  private onError(error: Error) {
    this.logger.error(error);
  }
}

