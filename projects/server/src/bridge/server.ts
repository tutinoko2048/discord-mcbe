import { ScriptBridgeServer, Session } from '@script-bridge/server';
import { DisconnectReason } from '@script-bridge/protocol';
import { Application } from '../main';
import { ScriptWorld } from './world';
import { Logger } from '../util';

import {
  ActionId,
  type PlayerJoinAction,
  type PlayerLeaveAction,
} from '@discord-mcbe/shared';

// type ServerOptions = ConstructorParameters<typeof ScriptBridgeServer>[0];

/** ScriptBridge wrapper */
export class BridgeServer {
  private readonly logger: Logger;
  public readonly server: ScriptBridgeServer;

  public readonly worlds = new Map<Session, ScriptWorld>();

  constructor(private readonly app: Application) {
    this.logger = new Logger('BridgeServer', this.app.config);
    this.server = new ScriptBridgeServer({ port: this.app.config.bridge_port });

    this.server.on('clientConnect', this.onClientConnect.bind(this));
    this.server.on('clientDisconnect', this.onClientDisconnect.bind(this));
    this.server.on('error', this.onError.bind(this));

    this.server.registerHandler<PlayerJoinAction>(ActionId.PlayerJoin, (action) => {
      const world = this.getWorldBySession(action.session);
      if (!world) throw new Error(`World not found: ${action.session.id}`);
      world.onPlayerJoin(action.data.player);
      action.respond();
    });

    this.server.registerHandler<PlayerLeaveAction>(ActionId.PlayerLeave, (action) => {
      const world = this.getWorldBySession(action.session);
      if (!world) throw new Error(`World not found: ${action.session.id}`);
      world.onPlayerLeave(action.data.playerUniqueId);
      action.respond();
    });
  }

  async start(): Promise<void> {
    await this.server.start();
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

