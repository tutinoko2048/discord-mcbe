import { MinecraftEvent } from './minecraft';
import type { Application } from '../application';
import type { ScriptWorld, ScriptPlayer } from '../minecraft';

/**
 * Cancellable.
 */
export class PlayerJoinEvent extends MinecraftEvent {
  public static readonly identifier = 'playerJoin';

  public readonly player: ScriptPlayer;

  constructor(app: Application, world: ScriptWorld, player: ScriptPlayer) {
    super(app, world);
    this.player = player;
  }
}
