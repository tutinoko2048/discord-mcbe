import { ApplicationEvent } from './app';
import type { Client } from 'discord.js';
import type { Application } from '../application';

export abstract class DiscordEvent extends ApplicationEvent {
  public readonly client: Client<true>;

  constructor(app: Application, client: Client<true>) {
    super(app);
    this.client = client;
  }
}
