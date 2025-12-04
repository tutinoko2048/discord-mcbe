import { ExtractOptional } from '@discord-mcbe/shared';
import { BaseClient } from './client';
import { SocketBridgeClient } from './transport';

export interface BridgeClientOptions {
  clientId?: string;
}

const defaultOptions: ExtractOptional<BridgeClientOptions> = {
  clientId: 'discord-mcbe-local',
};

export class BridgeClient extends BaseClient<SocketBridgeClient> {
  constructor(options: BridgeClientOptions = {}) {
    if (__DEV__) console.log('[discord-mcbe] Initializing bridge client...');

    const mergedOptions = { ...defaultOptions, ...options };

    const bridge = new SocketBridgeClient(mergedOptions);
    super(bridge);

    bridge.on('ready', () => {
      console.log('[discord-mcbe] Listening connection from discord-mcbe server...');
    });

    bridge.on('connect', () => {
      console.log('[discord-mcbe] Connection established!');
    });
  }
}
