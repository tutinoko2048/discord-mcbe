import { ApplicationEvent } from './app';
import type { Application } from '../main';
import { IWorld } from '../handlers';

export class ConnectEvent extends ApplicationEvent {
  public static readonly identifier = 'connect';

  public readonly world: IWorld;

  constructor(app: Application, world: IWorld) {
    super(app);
    this.world = world;
  }
}
