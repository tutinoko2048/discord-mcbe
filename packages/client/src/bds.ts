import { BaseClient, ClientType, WORLD_NAME_DYNAMIC_PROPERTY_KEY } from './client';
import { ServerNetBridgeClient } from './transport/server-net';
import { world } from '@minecraft/server';
import { handleClientBoundRequest } from './client/handler';

export interface BridgeClientOptions {
  url?: string;
  token?: string;
  worldName?: string | (() => string | undefined);
}

const DEFAULT_WORLD_NAME = 'Server';

const defaultOptions: Pick<Required<BridgeClientOptions>, 'url' | 'worldName'> = {
  url: 'ws://localhost:23191',
  worldName: () => {
    const worldName = world.getDynamicProperty(WORLD_NAME_DYNAMIC_PROPERTY_KEY);
    if (typeof worldName === 'string') return worldName;
  },
};

export class BridgeClient extends BaseClient<ServerNetBridgeClient> {
  readonly type = ClientType.BDS;

  constructor(options: BridgeClientOptions = {}) {
    const mergedOptions = {
      url: options.url ?? defaultOptions.url,
      worldName: options.worldName ?? defaultOptions.worldName,
    };

    const worldName = mergedOptions.worldName;
    const resolvedWorldName =
      typeof worldName === 'string' ? worldName : () => worldName() ?? DEFAULT_WORLD_NAME;

    const bridge = new ServerNetBridgeClient({
      url: mergedOptions.url,
      ...(options.token ? { token: options.token } : {}),
      worldName: resolvedWorldName,
      handleRequest: handleClientBoundRequest,
    });

    super(bridge, resolvedWorldName);
  }

  async start(): Promise<void> {
    console.log('[discord-mcbe] Connecting to discord-mcbe server...');
    const requestedAt = Date.now();
    await this.bridge.connect();
    console.log(`[discord-mcbe] Connection established! (${Date.now() - requestedAt}ms)`);
  }
}

export { ServerNetBridgeClient };
export { IBridgeClient } from './transport/interfaces';
export * from './transport/server-net';
export * from './client';
