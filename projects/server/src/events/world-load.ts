import { ApplicationEvent } from './app';
import { ScriptWorld } from '../minecraft';
import type { Application } from '../application';

export class WorldLoadEvent extends ApplicationEvent {
  public static readonly identifier = 'worldLoad';

  public readonly world: ScriptWorld;

  constructor(app: Application, world: ScriptWorld) {
    super(app);
    this.world = world;
  }
}
