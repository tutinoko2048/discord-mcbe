import { DiscordEvent } from './discord';

export class DiscordReadyEvent extends DiscordEvent {
  public static readonly identifier = 'discordReady';
}
