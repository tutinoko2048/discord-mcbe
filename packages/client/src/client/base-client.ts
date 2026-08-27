import { system, world } from '@minecraft/server';
import { ActionId, type WorldInitializeAction } from '@discord-mcbe/shared';
import { registerHandlers } from './handler';
import { registerEvents } from './event';
import { registerCommands } from './command';
import { createPlayerDescriptor } from './descriptors';
import { Logger } from '../utils';

import type { SocketBridgeClient, IBridgeClient, WebSocketBridgeClient } from '../transport';
import type { ScriptBridgeClient } from '@script-bridge/client';

export enum ClientType {
  Local = 'Local',
  BDS = 'BDS',
}

export abstract class BaseClient<T extends IBridgeClient = IBridgeClient> {
  public readonly bridge: T;

  public readonly logger = new Logger('discord-mcbe');

  abstract readonly type: ClientType;

  constructor(bridge: T) {
    this.bridge = bridge;

    // handle actions from server
    registerHandlers(this.bridge);
    // register events to send to server
    registerEvents(this.bridge);

    system.beforeEvents.startup.subscribe((ev) => registerCommands(ev.customCommandRegistry, this));

    this.bridge.on('connect', this.onConnect.bind(this));
  }

  setClientId(clientId: string) {
    world.setDynamicProperty('clientId', clientId);
  }

  getClientId(): string | undefined {
    return world.getDynamicProperty('clientId') as string | undefined;
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

  isLocal(): this is BaseClient<SocketBridgeClient> {
    return this.type === ClientType.Local;
  }

  isBDS(): this is BaseClient<ScriptBridgeClient | WebSocketBridgeClient> {
    return this.type === ClientType.BDS;
  }
}
