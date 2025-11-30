import { ActionId, WorldInitializeAction } from '@discord-mcbe/shared';
import { registerHandlers } from './handler';
import { registerEvents } from './event';
import { world } from '@minecraft/server';
import { createPlayerDescriptor } from './util';
import { IBridgeClient } from '../transport';


export class BaseClient<T extends IBridgeClient = IBridgeClient> {
  //TODO: client logger
  //

  public readonly bridge: T;

  constructor(bridge: T) {
    this.bridge = bridge;

    // handle actions from server
    registerHandlers(this.bridge);
    // register events to send to server
    registerEvents(this.bridge);

    console.log('[BridgeClient] Initialized');

    this.bridge.on('connect', this.onConnect.bind(this));
  }

  private onConnect() {
    const players = world.getPlayers();
    this.bridge
      .send<WorldInitializeAction>(ActionId.WorldInitialize, {
        players: players.map(createPlayerDescriptor),
      })
      .catch((error) => {
        console.error('[BridgeClient] Failed to send WorldInitializeAction:', error);
      });
  }
}
