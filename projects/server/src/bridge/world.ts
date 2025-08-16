import { Session } from '@script-bridge/server';
import { ResponseErrorReason } from '@script-bridge/protocol';
import { BridgeServer } from './server';
import { ScriptPlayer } from './player';
import type { RawMessage } from '@minecraft/server';
import {
  ActionId,
  type SendMessageAction,
  type RunCommandAction,
  type SendScriptEventAction,
  type GetTPSAction,
  type ChatSendAction,
  PlayerDescriptor,
  WorldInitializeAction,
} from '@discord-mcbe/shared';
import { PlayerChatEvent, PlayerJoinEvent, PlayerLeaveEvent } from '../events';
import { createPlayer, createWorld } from '../handlers';
import { ScriptDimension } from './dimension';

export class ScriptWorld {
  private readonly bridge: BridgeServer;

  public readonly session: Session;

  public readonly connectedAt: number = Date.now();

  /** { [uniqueId]: ScriptPlayer } */
  public readonly players = new Map<string, ScriptPlayer>();

  /** { [dimensionId]: ScriptDimension } */
  public readonly _dimensions = new Map<string, ScriptDimension>();

  //TODO: Scoreboard API

  constructor(bridge: BridgeServer, session: Session) {
    this.bridge = bridge;
    this.session = session;
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

  async runCommand(command: string): Promise<{ successCount: number }> {
    const res = await this.session.send<RunCommandAction>(ActionId.RunCommand, { command });
    if (res.error) throw new Error(`[${ResponseErrorReason[res.errorReason]}] ${res.message}`);
    return res.data;
  }

  async sendMessage(message: string | RawMessage | (string | RawMessage)[]): Promise<void> {
    const res = await this.session.send<SendMessageAction>(ActionId.SendMessage, { message });
    if (res.error) throw new Error(`[${ResponseErrorReason[res.errorReason]}] ${res.message}`);
  }

  async sendScriptEvent(id: string, message: string): Promise<void> {
    const res = await this.session.send<SendScriptEventAction>(ActionId.SendScriptEvent, { id, message });
    if (res.error) throw new Error(`[${ResponseErrorReason[res.errorReason]}] ${res.message}`);
  }

  async getTPS(): Promise<number> {
    const res = await this.session.send<GetTPSAction>(ActionId.GetTPS);
    if (res.error) throw new Error(`[${ResponseErrorReason[res.errorReason]}] ${res.message}`);
    return res.data.tps;
  }

  onInitialize(data: WorldInitializeAction['request']) {
    for (const player of data.players) {
      this.initializePlayer(player);
    }
  }

  onPlayerJoin(descriptor: PlayerDescriptor) {
    const player = this.initializePlayer(descriptor);

    new PlayerJoinEvent(this.bridge.app, createWorld(this), createPlayer(player)).emit();
  }

  onPlayerLeave(uniqueId: string) {
    const scriptPlayer = this.players.get(uniqueId);
    if (!scriptPlayer) throw new Error(`Player not found: ${uniqueId}`);

    new PlayerLeaveEvent(this.bridge.app, createWorld(this), createPlayer(scriptPlayer)).emit();

    this.players.delete(uniqueId);
  }

  onChatSend(data: ChatSendAction['request']) {
    const { senderName, senderUniqueId, message } = data;
    const player = this.players.get(senderUniqueId);
    if (!player) throw new Error(`Player not found: ${senderName} (${senderUniqueId})`);

    new PlayerChatEvent(this.bridge.app, createWorld(this), createPlayer(player), message).emit();

    console.log(`[${this.name}] [onChatSend] ${player.name}: ${message}`);
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
