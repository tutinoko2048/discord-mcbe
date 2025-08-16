import { ApplicationEvent } from './app';
import type { Application } from '../main';
import { IPlayer, IWorld } from '../handlers';

export class PlayerJoinEvent extends ApplicationEvent {
  public static readonly identifier = 'playerJoin';

  public readonly world: IWorld;
  public readonly player: IPlayer;

  constructor(app: Application, world: IWorld, player: IPlayer) {
    super(app);
    this.world = world;
    this.player = player;
  }
}
