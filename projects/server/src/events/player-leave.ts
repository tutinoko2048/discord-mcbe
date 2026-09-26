import { MinecraftEvent } from './minecraft';
import type { Application } from '../application';
import type { ScriptWorld, ScriptPlayer } from '../minecraft';

/**
 * Cancellable.
 */
export class PlayerLeaveEvent extends MinecraftEvent {
  public static readonly identifier = 'playerLeave';

  public readonly player: ScriptPlayer;

  constructor(app: Application, world: ScriptWorld, player: ScriptPlayer) {
    super(app, world);
    this.player = player;
  }
}
