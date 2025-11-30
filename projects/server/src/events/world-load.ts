import { ApplicationEvent } from './app';
import type { Application } from '../main';
import { ScriptWorld } from '../bridge';

export class WorldLoadEvent extends ApplicationEvent {
  public static readonly identifier = 'worldLoad';

  public readonly world: ScriptWorld;

  constructor(app: Application, world: ScriptWorld) {
    super(app);
    this.world = world;
  }
}
