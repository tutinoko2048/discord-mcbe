import { ScriptBridgeServer, Session } from '@script-bridge/server';
import { DisconnectReason } from '@script-bridge/protocol';
import { Application } from '../main';
import { ScriptWorld } from './world';
import { Logger } from '../util';
import { ConnectEvent, DisconnectEvent } from '../events';
import { createWorld } from '../handlers';
import {
  ActionId,
  type PlayerJoinAction,
  type PlayerLeaveAction,
  type ChatSendAction,
  WorldInitializeAction,
} from '@discord-mcbe/shared';

/** ScriptBridge wrapper */
export class BridgeServer {
  private readonly logger: Logger;
  public readonly server: ScriptBridgeServer;

  public readonly worlds = new Map<Session, ScriptWorld>();

  constructor(public readonly app: Application) {
    this.logger = new Logger('BridgeServer', this.app.config);
    this.server = new ScriptBridgeServer({
      port: this.app.config.bridge_port,
      timeoutThresholdMultiplier: 10,
    });

    this.server.on('clientConnect', this.onClientConnect.bind(this));
    this.server.on('clientDisconnect', this.onClientDisconnect.bind(this));
    this.server.on('error', this.onError.bind(this));

    this.server.registerHandler<WorldInitializeAction>(ActionId.WorldInitialize, (action) => {
      const world = this.getWorldBySession(action.session);
      if (!world) throw new Error(`World not found: ${action.session.id}`);
      world.onInitialize(action.data);
      this.logger.debug(`World initialized: ${world.name}`);
    });

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

    this.server.registerHandler<ChatSendAction>(ActionId.ChatSend, (action) => {
      const world = this.getWorldBySession(action.session);
      if (!world) throw new Error(`World not found: ${action.session.id}`);
      world.onChatSend(action.data);
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
    this.logger.debug(`Client connected: ${session.id}`);

    new ConnectEvent(this.app, createWorld(world)).emit();
  }

  private onClientDisconnect(session: Session, reason: DisconnectReason) {
    const world = this.worlds.get(session);
    if (world) {
      new DisconnectEvent(this.app, createWorld(world)).emit();
    }

    this.worlds.delete(session);
    this.logger.debug(`Client disconnected: ${session.id} (${DisconnectReason[reason]})`);
  }

  private onError(error: Error) {
    this.logger.error(error);
  }
}
