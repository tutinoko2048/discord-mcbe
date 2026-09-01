import { BaseClient, ClientType, WORLD_NAME_DYNAMIC_PROPERTY_KEY } from './client';
import { ServerNetBridgeClient } from './transport/server-net';
import type { ExtractOptional } from '@discord-mcbe/shared';
import { world } from '@minecraft/server';
import { handleClientBoundRequest } from './client/handler';

export interface BridgeClientOptions {
  host?: string;
  port?: number;
  worldName?: string | (() => string | undefined);
}

const DEFAULT_WORLD_NAME = 'Server';

const defaultOptions: ExtractOptional<BridgeClientOptions> = {
  host: 'localhost',
  port: 23191,
  worldName: () => {
    const worldName = world.getDynamicProperty(WORLD_NAME_DYNAMIC_PROPERTY_KEY);
    if (typeof worldName === 'string') return worldName;
  },
};

export class BridgeClient extends BaseClient<ServerNetBridgeClient> {
  readonly type = ClientType.BDS;

  constructor(options: BridgeClientOptions = {}) {
    const mergedOptions = {
      host: options.host ?? defaultOptions.host,
      port: options.port ?? defaultOptions.port,
      worldName: options.worldName ?? defaultOptions.worldName,
    };

    const worldName = mergedOptions.worldName;

    const bridge = new ServerNetBridgeClient({
      url: `ws://${mergedOptions.host}:${mergedOptions.port}`,
      worldName: typeof worldName === 'string' ? worldName : () => worldName() ?? DEFAULT_WORLD_NAME,
      handleRequest: handleClientBoundRequest,
    });

    super(bridge);
  }

  async start(): Promise<void> {
    console.log('[discord-mcbe] Connecting to discord-mcbe server...');
    const requestedAt = Date.now();
    await this.bridge.connect();
    console.log(`[discord-mcbe] Connection established! (${Date.now() - requestedAt}ms)`);
  }
}

export { ServerNetBridgeClient };
export * from './client';
