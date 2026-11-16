import { MinecraftEvent } from './minecraft';
import type { ChatFormatting } from '@discord-mcbe/shared';
import type { ScriptWorld, ScriptPlayer } from '../minecraft';
import type { Application } from '../application';

/**
 * Cancellable.
 */
export class MinecraftMessageEvent extends MinecraftEvent {
  public static readonly identifier = 'minecraftMessage';

  public readonly sender: ScriptPlayer;

  /** Message body without {@link formatting} applied. */
  public message: string;

  /** Decoration shown around the sender name and the message. */
  public formatting: ChatFormatting;

  /** Name of the add-on that reported this message. `undefined` for regular Minecraft chat. */
  public readonly source: string | undefined;

  constructor(
    app: Application,
    world: ScriptWorld,
    sender: ScriptPlayer,
    message: string,
    formatting: ChatFormatting = {},
    source?: string,
  ) {
    super(app, world);
    this.sender = sender;
    this.message = message;
    this.formatting = formatting;
    this.source = source;
  }
}
