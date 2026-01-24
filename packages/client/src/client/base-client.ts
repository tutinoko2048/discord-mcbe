import { system, world } from '@minecraft/server';
import { ActionId, type WorldInitializeAction } from '@discord-mcbe/shared';
import { registerHandlers } from './handler';
import { registerEvents } from './event';
import { registerCommands } from './command';
import { createPlayerDescriptor } from './descriptors';
import { Logger } from '../utils';

import type { IBridgeClient } from '../transport';

export class BaseClient<T extends IBridgeClient = IBridgeClient> {
  public readonly bridge: T;

  public readonly logger = new Logger('discord-mcbe');

  constructor(bridge: T) {
    this.bridge = bridge;

    // handle actions from server
    registerHandlers(this.bridge);
    // register events to send to server
    registerEvents(this.bridge);

    system.beforeEvents.startup.subscribe(ev => registerCommands(ev.customCommandRegistry));

    this.bridge.on('connect', this.onConnect.bind(this));
  }

  private async onConnect() {
    const players = world.getPlayers();

    try {
      await this.bridge.send<WorldInitializeAction>(ActionId.WorldInitialize, {
        players: players.map(createPlayerDescriptor),
      });
    } catch (error) {
      this.logger.error('Failed to send WorldInitializeAction:', error);
    }
  }
}
