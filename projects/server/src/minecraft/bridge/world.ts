import {
  ActionId,
  type ServerBoundRequestPacket,
  type PlayerDescriptor,
  type UniqueId,
  type DisconnectReason,
  type PlayerDieDamagingEntity,
} from '@discord-mcbe/shared';
import { ScriptPlayer } from './player';
import { ScriptScoreboard } from './scoreboard';
import { BridgeActionError, CommandError } from './errors';
import { MinecraftMessageEvent, PlayerDieEvent, PlayerJoinEvent, PlayerLeaveEvent } from '../../events';
import { Logger } from '../../util';

import type { EntityDamageCause, RawMessage } from '@minecraft/server';
import type { ServerNetSession, ISession, SocketSession } from '../transport';
import type { ScriptDimension } from './dimension';
import type { Application } from '../../application';

export class ScriptWorld<SESSION extends ISession = ISession> {
  private readonly app: Application;
  private readonly _isLocal: boolean;

  public readonly session: SESSION;

  public readonly logger: Logger;

  public readonly connectedAt: number = Date.now();

  public readonly players = new Map<UniqueId, ScriptPlayer>();

  /** { [dimensionId]: ScriptDimension } */
  public readonly _dimensions = new Map<string, ScriptDimension>();

  public readonly scoreboard: ScriptScoreboard;

  constructor(app: Application, session: SESSION, isLocal: boolean) {
    this.app = app;
    this.session = session;
    this._isLocal = isLocal;
    this.logger = new Logger(this.name, this.app.config);
    this.scoreboard = new ScriptScoreboard(this.session);
  }

  get name(): string {
    return this.session.worldName;
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
    const res = await this.session.send(ActionId.RunCommand, { command });
    if (res.error) throw new BridgeActionError(res);
    if (res.data.error) throw new CommandError(res.data.message);
    return { successCount: res.data.successCount };
  }

  async sendMessage(message: string | RawMessage | (string | RawMessage)[]): Promise<void> {
    const res = await this.session.send(ActionId.SendMessage, { message });
    if (res.error) throw new BridgeActionError(res);
  }

  async sendScriptEvent(id: string, message: string): Promise<void> {
    const res = await this.session.send(ActionId.SendScriptEvent, {
      id,
      message,
    });
    if (res.error) throw new BridgeActionError(res);
  }

  async getTPS(): Promise<number> {
    const res = await this.session.send(ActionId.GetTPS, null);
    if (res.error) throw new BridgeActionError(res);
    return res.data.tps;
  }

  async disconnect(reason?: DisconnectReason) {
    return await this.session.disconnect(reason);
  }

  isLocal(): this is ScriptWorld<SocketSession> {
    return this._isLocal;
  }

  isServer(): this is ScriptWorld<ServerNetSession> {
    return !this._isLocal;
  }

  /** @internal */
  onInitialize(data: Extract<ServerBoundRequestPacket, { type: ActionId.WorldInitialize }>['data']) {
    for (const player of data.players) {
      this.initializePlayer(player);
    }

    this.logger.debug(`World initialized: ${this.name}`);
  }

  /** @internal */
  onPlayerJoin(descriptor: PlayerDescriptor) {
    const player = this.initializePlayer(descriptor);

    new PlayerJoinEvent(this.app, this, player).emit();
  }

  /** @internal */
  onPlayerLeave(playerUniqueId: UniqueId) {
    const player = this.players.get(playerUniqueId);
    if (!player) throw new Error(`Player not found: ${playerUniqueId}`);

    new PlayerLeaveEvent(this.app, this, player).emit();

    this.players.delete(playerUniqueId);
  }

  /** @internal */
  onPlayerDie(playerUniqueId: UniqueId, cause: EntityDamageCause, damagingEntity?: PlayerDieDamagingEntity) {
    const player = this.players.get(playerUniqueId);
    if (!player) throw new Error(`Player not found: ${playerUniqueId}`);

    new PlayerDieEvent(this.app, this, player, cause, damagingEntity).emit();
  }

  /** @internal */
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
