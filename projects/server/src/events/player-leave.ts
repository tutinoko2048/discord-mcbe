import { ApplicationEvent } from './app';
import type { Application } from '../application';
import type { ScriptWorld, ScriptPlayer } from '../bridge';

export class PlayerLeaveEvent extends ApplicationEvent {
  public static readonly identifier = 'playerLeave';

  public readonly world: ScriptWorld;

  public readonly player: ScriptPlayer;

  constructor(app: Application, world: ScriptWorld, player: ScriptPlayer) {
    super(app);
    this.world = world;
    this.player = player;
  }
}
