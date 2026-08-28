import {
  ActionId,
  type SendMessageAction,
  type RunCommandAction,
  type SendScriptEventAction,
  type GetTPSAction,
  type PlayerDescriptor,
  type WorldInitializeAction,
  type UniqueId,
  type DisconnectReason,
} from '@discord-mcbe/shared';
import { ScriptPlayer } from './player';
import { ScriptScoreboard } from './scoreboard';
import { BridgeActionError, CommandError } from './errors';
import { MinecraftMessageEvent, PlayerJoinEvent, PlayerLeaveEvent } from '../../events';
import { Logger } from '../../util';

import type { RawMessage } from '@minecraft/server';
import type { BdsWebSocketSession, ISession, SocketSession } from './transport';
import type { ScriptDimension } from './dimension';
import type { Application } from '../../application';

export class ScriptWorld<S extends ISession = ISession> {
  private readonly app: Application;
  private readonly _isLocal: boolean;

  public readonly session: S;

  public readonly logger: Logger;

  public readonly connectedAt: number = Date.now();

  /** { [uniqueId]: ScriptPlayer } */
  public readonly players = new Map<UniqueId, ScriptPlayer>();

  /** { [dimensionId]: ScriptDimension } */
  public readonly _dimensions = new Map<string, ScriptDimension>();

  public readonly scoreboard: ScriptScoreboard;

  constructor(app: Application, session: S, isLocal: boolean) {
    this.app = app;
    this.session = session;
    this._isLocal = isLocal;
    this.logger = new Logger(this.name, this.app.config);
    this.scoreboard = new ScriptScoreboard(this.session);
  }

  get name(): string {
    return this.session.clientId;
  }

  get averagePing(): number {
    return this.session.averagePing;
  }

  getPlayers(): ScriptPlayer[] {
    return Array.from(this.players.values());
  }

  getPlayerList(): { players: ScriptPlayer[]; current: number; max?: number } {
    const players = this.getPlayers();
    const current = players.length;
    const max = this.isLocal() ? this.session.world.maxPlayers : undefined;
    return { players, current, max };
  }

  async runCommand(command: string): Promise<{ successCount: number }> {
    const res = await this.session.send<RunCommandAction>(ActionId.RunCommand, { command });
    if (res.error) throw new BridgeActionError(res);
    if (res.data.error) throw new CommandError(res.data.message);
    return { successCount: res.data.successCount };
  }

  async sendMessage(message: string | RawMessage | (string | RawMessage)[]): Promise<void> {
    const res = await this.session.send<SendMessageAction>(ActionId.SendMessage, { message });
    if (res.error) throw new BridgeActionError(res);
  }

  async sendScriptEvent(id: string, message: string): Promise<void> {
    const res = await this.session.send<SendScriptEventAction>(ActionId.SendScriptEvent, {
      id,
      message,
    });
    if (res.error) throw new BridgeActionError(res);
  }

  async getTPS(): Promise<number> {
    const res = await this.session.send<GetTPSAction>(ActionId.GetTPS);
    if (res.error) throw new BridgeActionError(res);
    return res.data.tps;
  }

  async disconnect(reason?: DisconnectReason) {
    return await this.session.disconnect(reason);
  }

  isLocal(): this is ScriptWorld<SocketSession> {
    return this._isLocal;
  }

  isServer(): this is ScriptWorld<BdsWebSocketSession> {
    return !this._isLocal;
  }

  onInitialize(data: WorldInitializeAction['request']) {
    for (const player of data.players) {
      this.initializePlayer(player);
    }

    this.logger.debug(`World initialized: ${this.name}`);
  }

  onPlayerJoin(descriptor: PlayerDescriptor) {
    const player = this.initializePlayer(descriptor);

    new PlayerJoinEvent(this.app, this, player).emit();
  }

  onPlayerLeave(playerUniqueId: UniqueId) {
    const player = this.players.get(playerUniqueId);
    if (!player) throw new Error(`Player not found: ${playerUniqueId}`);

    new PlayerLeaveEvent(this.app, this, player).emit();

    this.players.delete(playerUniqueId);
  }

  onChatSend(senderUniqueId: UniqueId, message: string) {
    const sender = this.players.get(senderUniqueId);
    if (!sender) throw new Error(`Player not found: ${senderUniqueId}`);

    new MinecraftMessageEvent(this.app, this, sender, message).emit();
  }

  /**
   * Create ScriptPlayer and bind it to the world.
   */
  private initializePlayer(descriptor: PlayerDescriptor): ScriptPlayer {
    const player = new ScriptPlayer(this, descriptor);
    this.players.set(descriptor.uniqueId, player);
    return player;
  }
}
