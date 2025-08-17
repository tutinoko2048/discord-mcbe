import { ScriptBridgeServer, type Session } from '@script-bridge/server';
import { DisconnectReason } from '@script-bridge/protocol';
import type { Application } from '../main';
import { ScriptWorld } from './world';
import { Logger } from '../util';
import {
  ActionId,
  type PlayerJoinAction,
  type PlayerLeaveAction,
  type ChatSendAction,
  type WorldInitializeAction,
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

      const { senderUniqueId, message } = action.data;

      const sender = world.players.get(senderUniqueId);
      if (!sender) throw new Error(`Player not found: ${senderUniqueId}`);

      this.app.minecraft.onPlayerChat(world, sender, message);
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
    this.app.minecraft.onConnect(world);
  }

  private onClientDisconnect(session: Session, reason: DisconnectReason) {
    const world = this.worlds.get(session)!;
    this.app.minecraft.onDisconnect(world, DisconnectReason[reason]);
    this.worlds.delete(session);
  }

  private onError(error: Error) {
    this.logger.error(error);
  }
}
