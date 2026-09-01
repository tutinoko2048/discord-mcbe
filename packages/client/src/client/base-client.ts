import { system, world } from '@minecraft/server';
import { ActionId, DisconnectReason } from '@discord-mcbe/shared';
import { registerEvents } from './event';
import { registerCommands } from './command';
import { createPlayerDescriptor } from './descriptors';
import { Logger } from '../utils';

import type { ServerNetBridgeClient } from '../transport/server-net';
import type { WebSocketBridgeClient } from '../transport/websocket';
import type { IBridgeClient } from '../transport/interfaces';
import { WORLD_NAME_DYNAMIC_PROPERTY_KEY } from './constants';

export enum ClientType {
  Local = 'Local',
  BDS = 'BDS',
}

export abstract class BaseClient<T extends IBridgeClient = IBridgeClient> {
  public readonly bridge: T;

  public readonly logger = new Logger('discord-mcbe');

  private hasConnected = false;

  abstract readonly type: ClientType;

  constructor(bridge: T) {
    this.bridge = bridge;

    // register events to send to server
    registerEvents(this.bridge);

    system.beforeEvents.startup.subscribe((ev) => registerCommands(ev.customCommandRegistry, this));

    this.bridge.on('connect', this.onBridgeConnect.bind(this));
    this.bridge.on('disconnect', this.onBridgeDisconnect.bind(this));
  }

  setWorldName(worldName: string) {
    world.setDynamicProperty(WORLD_NAME_DYNAMIC_PROPERTY_KEY, worldName);
  }

  getWorldName(): string | undefined {
    return world.getDynamicProperty(WORLD_NAME_DYNAMIC_PROPERTY_KEY) as string | undefined;
  }

  private async onConnect() {
    const players = world.getPlayers();

    try {
      const result = await this.bridge.request({
        type: ActionId.WorldInitialize,
        data: { players: players.map(createPlayerDescriptor) },
      });
      if (result.error) throw new Error(result.message);
    } catch (error) {
      this.logger.error('Failed to send WorldInitialize packet:', error);
    }
  }

  private onBridgeConnect({ sessionId }: { sessionId: string }): void {
    if (this.hasConnected) {
      this.logger.info(`Bridge reconnected (session: ${sessionId})`);
    }
    this.hasConnected = true;
    void this.onConnect();
  }

  private onBridgeDisconnect({ reason }: { reason: DisconnectReason }): void {
    this.logger.info(`Bridge disconnected (${DisconnectReason[reason]})`);
  }

  isLocal(): this is BaseClient<WebSocketBridgeClient> {
    return this.type === ClientType.Local;
  }

  isBDS(): this is BaseClient<ServerNetBridgeClient> {
    return this.type === ClientType.BDS;
  }
}
