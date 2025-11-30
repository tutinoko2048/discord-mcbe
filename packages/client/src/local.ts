import { ExtractOptional } from '@discord-mcbe/shared';
import { BaseClient } from './client';
import { SocketBridgeClient } from './transport';

export interface BridgeClientOptions {
  clientId?: string;
}

const defaultOptions: ExtractOptional<BridgeClientOptions> = {
  clientId: 'discord-mcbe-local',
}

export class BridgeClient extends BaseClient<SocketBridgeClient> {
  constructor(options: BridgeClientOptions = {}) {
    const mergedOptions = { ...defaultOptions, ...options };

    const bridge = new SocketBridgeClient(mergedOptions);
    super(bridge);

    console.log('[BridgeClient] Listening connection from discord-mcbe server...');
  }
}
