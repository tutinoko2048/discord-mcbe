import { ApplicationEvent } from './app';
import type { Application } from '../application';
import type { Message } from 'discord.js';

/**
 * Cancellable.
 */
export class DiscordMessageEvent extends ApplicationEvent {
  public static readonly identifier = 'discordMessage';

  public message: Message<true>;

  constructor(app: Application, message: Message<true>) {
    super(app);
    this.message = message;
  }
}
