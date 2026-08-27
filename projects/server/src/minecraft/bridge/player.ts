import {
  ActionId,
  type PlayerDescriptor,
  type SendMessageAction,
  type GetEntityLocationAction,
  type GetEntityDimensionAction,
  type GetGameModeAction,
  type SetGameModeAction,
  type KickPlayerAction,
  type GameMode,
  type UniqueId,
  type Pfid,
} from '@discord-mcbe/shared';
import type { ScriptWorld } from './world';
import { ScreenDisplay } from './screen-display';

import type { RawMessage, Vector3 } from '@minecraft/server';
import { ScriptDimension } from './dimension';
import { BridgeActionError } from './errors';

export class ScriptPlayer {
  public readonly world: ScriptWorld;

  public readonly name: string;

  public readonly nameTag: string;

  public readonly uniqueId: UniqueId;

  public readonly pfid: Pfid;

  public readonly onScreenDisplay: ScreenDisplay;

  constructor(world: ScriptWorld, descriptor: PlayerDescriptor) {
    this.world = world;
    this.name = descriptor.name;
    this.nameTag = descriptor.nameTag;
    this.uniqueId = descriptor.uniqueId;
    this.pfid = descriptor.pfid;
    this.onScreenDisplay = new ScreenDisplay(this);
  }

  get isValid() {
    return this.world.players.has(this.uniqueId);
  }

  async sendMessage(message: string | RawMessage | (string | RawMessage)[]): Promise<void> {
    const res = await this.world.session.send<SendMessageAction>(ActionId.SendMessage, {
      message,
      playerUniqueId: this.uniqueId,
    });
    if (res.error) throw new BridgeActionError(res);
  }

  async getLocation(): Promise<Vector3> {
    const res = await this.world.session.send<GetEntityLocationAction>(ActionId.GetEntityLocation, {
      entityUniqueId: this.uniqueId,
    });
    if (res.error) throw new BridgeActionError(res);

    return res.data.location;
  }

  async getDimension(): Promise<ScriptDimension> {
    const res = await this.world.session.send<GetEntityDimensionAction>(ActionId.GetEntityDimension, {
      entityUniqueId: this.uniqueId,
    });
    if (res.error) throw new BridgeActionError(res);

    const dimensionId = res.data.dimension.id;
    let dimension = this.world._dimensions.get(dimensionId);
    if (!dimension) {
      dimension = new ScriptDimension(res.data.dimension);
      this.world._dimensions.set(dimensionId, dimension);
    }
    return dimension;
  }

  async getGameMode(): Promise<GameMode> {
    const res = await this.world.session.send<GetGameModeAction>(ActionId.GetGameMode, {
      playerUniqueId: this.uniqueId,
    });
    if (res.error) throw new BridgeActionError(res);

    return res.data.gameMode;
  }

  async setGameMode(gameMode: GameMode): Promise<void> {
    const res = await this.world.session.send<SetGameModeAction>(ActionId.SetGameMode, {
      playerUniqueId: this.uniqueId,
      gameMode,
    });
    if (res.error) throw new BridgeActionError(res);
  }

  async kick(reason?: string): Promise<void> {
    const res = await this.world.session.send<KickPlayerAction>(ActionId.KickPlayer, {
      playerUniqueId: this.uniqueId,
      reason,
    });
    if (res.error) throw new BridgeActionError(res);
  }
}
