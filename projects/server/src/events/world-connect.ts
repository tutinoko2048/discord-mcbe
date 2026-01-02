import { ApplicationEvent } from './app';
import { ScriptWorld } from '../minecraft';
import type { Application } from '../application';

export class WorldConnectEvent extends ApplicationEvent {
  public static readonly identifier = 'worldConnect';

  public readonly world: ScriptWorld;

  constructor(app: Application, world: ScriptWorld) {
    super(app);
    this.world = world;
  }
}
