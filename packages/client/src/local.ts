import { world } from '@minecraft/server';
import { BaseClient, ClientType } from './client';
import { WebSocketBridgeClient } from './transport/websocket';
import { handleClientBoundRequest } from './client/handler';
import type { ExtractOptional } from '@discord-mcbe/shared';

export interface BridgeClientOptions {
  clientId?: string | (() => string);
}

const defaultOptions: ExtractOptional<BridgeClientOptions> = {
  clientId: () => (world.getDynamicProperty('clientId') as string) ?? 'discord-mcbe-local',
};

export class BridgeClient extends BaseClient<WebSocketBridgeClient> {
  readonly type = ClientType.Local;

  constructor(options: BridgeClientOptions = {}) {
    if (__DEV__) console.log('§7[discord-mcbe] Initializing bridge client...');

    const mergedOptions = { ...defaultOptions, ...options };

    const bridge = new WebSocketBridgeClient({ ...mergedOptions, handleRequest: handleClientBoundRequest });
    super(bridge);

    bridge.on('ready', () => {
      console.info('[discord-mcbe] Listening connection from discord-mcbe server...');
    });

    bridge.on('connect', () => {
      console.info('[discord-mcbe] Connection established!');
    });
  }
}
