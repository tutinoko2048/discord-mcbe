import { MinecraftEvent } from './minecraft';
import { ScriptWorld, ScriptPlayer } from '../minecraft';
import type { Application } from '../application';

/**
 * Cancellable.
 */
export class MinecraftMessageEvent extends MinecraftEvent {
  public static readonly identifier = 'minecraftMessage';

  public readonly sender: ScriptPlayer;

  public message: string;

  constructor(app: Application, world: ScriptWorld, sender: ScriptPlayer, message: string) {
    super(app, world);
    this.sender = sender;
    this.message = message;
  }
}
