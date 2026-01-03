import { ApplicationEvent } from './app';
import { ScriptWorld } from '../minecraft';
import type { Application } from '../application';

export abstract class MinecraftEvent extends ApplicationEvent {
  public readonly world: ScriptWorld;

  constructor(app: Application, world: ScriptWorld) {
    super(app);
    this.world = world;
  }
}
