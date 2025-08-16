import { ActionId, ExtractOptional, WorldInitializeAction } from '@discord-mcbe/shared';
import { ScriptBridgeClient } from '@script-bridge/client';
import { registerHandlers } from './handler';
import { registerEvents } from './event';
import { world } from '@minecraft/server';
import { createPlayerDescriptor } from './util';

export interface ClientOptions {
  host?: string;
  port?: number;
  clientId?: string;
}

const defaultOptions: ExtractOptional<ClientOptions> = {
  host: 'localhost',
  port: 23191,
  clientId: 'discord-mcbe-client',
};

export class BridgeClient {
  public readonly options: ClientOptions;

  //TODO: client logger
  //

  public readonly bridge: ScriptBridgeClient;

  constructor(options: ClientOptions = {}) {
    this.options = { ...defaultOptions, ...options };

    this.bridge = new ScriptBridgeClient({
      url: `http://${this.options.host}:${this.options.port}`,
      clientId: this.options.clientId
    });

    // handle actions from server
    registerHandlers(this.bridge);
    // register events to send to server
    registerEvents(this.bridge);

    console.log('[BridgeClient] Initialized');

    this.bridge.on('connect', this.onConnect.bind(this));
  }

  async start(): Promise<void> {
    console.log('[BridgeClient] Connecting to discord-mcbe server...');
    const requestedAt = Date.now();
    await this.bridge.connect();
    console.log(`[BridgeClient] Connection established! (${Date.now() - requestedAt}ms)`);
  }

  private onConnect() {
    const players = world.getPlayers();
    this.bridge.send<WorldInitializeAction>(ActionId.WorldInitialize, {
      players: players.map(createPlayerDescriptor)
    }).catch((error) => {
      console.error('[BridgeClient] Failed to send WorldInitializeAction:', error);
    });
  }
}
