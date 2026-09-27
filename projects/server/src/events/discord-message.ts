import { DiscordEvent } from './discord';
import type { Message } from 'discord.js';
import type { Application } from '../application';

/**
 * Cancellable.
 */
export class DiscordMessageEvent extends DiscordEvent {
  public static readonly identifier = 'discordMessage';

  public message: Message<true>;

  constructor(app: Application, message: Message<true>) {
    super(app, message.client);
    this.message = message;
  }
}
