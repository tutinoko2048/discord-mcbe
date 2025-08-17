import { ApplicationEvent } from './app';
import type { Application } from '../main';
import type { IWorld } from '../handlers';

export class DisconnectEvent extends ApplicationEvent {
  public static readonly identifier = 'disconnect';

  public readonly world: IWorld;

  public readonly reason?: string;

  constructor(app: Application, world: IWorld, reason?: string) {
    super(app);
    this.world = world;
    this.reason = reason;
  }
}
