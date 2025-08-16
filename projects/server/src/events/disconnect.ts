import { ApplicationEvent } from './app';
import type { Application } from '../main';
import { IWorld } from '../handlers';

export class DisconnectEvent extends ApplicationEvent {
  public static readonly identifier = 'disconnect';

  public readonly world: IWorld;

  constructor(app: Application, world: IWorld) {
    super(app);
    this.world = world;
  }
}
