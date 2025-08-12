import { ApplicationEvent } from './app';
import type { Application } from '../main';
import { IPlayer, IWorld } from '../handlers';

export class PlayerLeaveEvent extends ApplicationEvent {
  public readonly world: IWorld;
  public readonly player: IPlayer;

  constructor(
    app: Application,
    world: IWorld,
    player: IPlayer,
  ) {
    super(app);
    this.world = world;
    this.player = player;
  }
}
