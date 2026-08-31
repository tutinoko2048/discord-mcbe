import { MinecraftEvent } from './minecraft';
import type { Application } from '../application';
import type { ScriptWorld, ScriptPlayer } from '../minecraft';
import type { EntityDamageCause } from '@minecraft/server';
import type { PlayerDieDamagingEntity } from '@discord-mcbe/shared';

export class PlayerDieEvent extends MinecraftEvent {
  public static readonly identifier = 'playerDie';

  constructor(
    app: Application,
    world: ScriptWorld,
    public readonly player: ScriptPlayer,
    public readonly cause: EntityDamageCause,
    public readonly damagingEntity?: PlayerDieDamagingEntity,
  ) {
    super(app, world);
  }
}
