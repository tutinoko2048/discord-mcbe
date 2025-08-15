import {
  PlayerDescriptor,
  ActionId,
  type SendMessageAction,
  type GetEntityLocationAction,
  type GetGameModeAction,
  type SetGameModeAction,
  type GameMode,
} from '@discord-mcbe/shared';
import { ResponseErrorReason } from '@script-bridge/protocol';
import { ScriptWorld } from './world';

import type { RawMessage, Vector3 } from '@minecraft/server';

export class ScriptPlayer {
  private readonly world: ScriptWorld;
  
  public readonly name: string;

  public readonly nameTag: string;

  public readonly uniqueId: string;

  constructor(world: ScriptWorld, descriptor: PlayerDescriptor) {
    this.world = world;
    this.name = descriptor.name;
    this.nameTag = descriptor.nameTag;
    this.uniqueId = descriptor.uniqueId;
  }

  get isValid() {
    return this.world.players.has(this.uniqueId);
  }

  async sendMessage(message: string | RawMessage | (string | RawMessage)[]): Promise<void> {
    const res = await this.world.session.send<SendMessageAction>(ActionId.SendMessage, {
      message,
      playerUniqueId: this.uniqueId,
    });
    if (res.error) throw new Error(`[${ResponseErrorReason[res.errorReason]}] ${res.message}`);
  }

  async getLocation(): Promise<{ location: Vector3; dimensionId: string }> {
    const res = await this.world.session.send<GetEntityLocationAction>(ActionId.GetEntityLocation, {
      entityUniqueId: this.uniqueId,
    });
    if (res.error) throw new Error(`[${ResponseErrorReason[res.errorReason]}] ${res.message}`);

    return res.data;
  }

  async getGameMode(): Promise<GameMode> {
    const res = await this.world.session.send<GetGameModeAction>(ActionId.GetGameMode, {
      playerUniqueId: this.uniqueId,
    });
    if (res.error) throw new Error(`[${ResponseErrorReason[res.errorReason]}] ${res.message}`);

    return res.data.gameMode;
  }

  async setGameMode(gameMode: GameMode): Promise<void> {
    const res = await this.world.session.send<SetGameModeAction>(ActionId.SetGameMode, {
      playerUniqueId: this.uniqueId,
      gameMode,
    });
    if (res.error) throw new Error(`[${ResponseErrorReason[res.errorReason]}] ${res.message}`);
  }
}
