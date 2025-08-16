import { ApplicationEvent } from './app';
import type { Application } from '../main';
import { IPlayer, IWorld } from '../handlers';

export class PlayerChatEvent extends ApplicationEvent {
  public static readonly identifier = 'playerChat';

  public readonly world: IWorld;
  public readonly sender: IPlayer;
  public readonly message: string;

  constructor(app: Application, world: IWorld, sender: IPlayer, message: string) {
    super(app);
    this.world = world;
    this.sender = sender;
    this.message = message;
  }
}
