import { ApplicationEvent } from './app';
import { ScriptWorld, ScriptPlayer } from '../minecraft';
import type { Application } from '../application';

/**
 * Cancellable.
 */
export class ChatSendEvent extends ApplicationEvent {
  public static readonly identifier = 'chatSend';

  public readonly world: ScriptWorld;

  public readonly sender: ScriptPlayer;

  public message: string;

  constructor(app: Application, world: ScriptWorld, sender: ScriptPlayer, message: string) {
    super(app);
    this.world = world;
    this.sender = sender;
    this.message = message;
  }
}
