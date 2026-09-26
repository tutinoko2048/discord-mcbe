import { DiscordEvent } from './discord';
import type { Client, RESTPostAPIChannelMessageJSONBody, TextChannel } from 'discord.js';
import type { Application } from '../application';

/**
 * Cancellable.
 */
export class DiscordSendEvent extends DiscordEvent {
  public static readonly identifier = 'discordSend';

  public channel: TextChannel;
  public readonly source: string;
  public message: RESTPostAPIChannelMessageJSONBody;

  constructor(
    app: Application,
    client: Client<true>,
    channel: TextChannel,
    message: RESTPostAPIChannelMessageJSONBody,
    source: string,
  ) {
    super(app, client);
    this.channel = channel;
    this.message = message;
    this.source = source;
  }
}
