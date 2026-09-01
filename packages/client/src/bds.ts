import { BaseClient, ClientType } from './client';
import { ServerNetBridgeClient } from './transport/server-net';
import type { ExtractOptional } from '@discord-mcbe/shared';
import { world } from '@minecraft/server';
import { handleClientBoundRequest } from './client/handler';

export interface BridgeClientOptions {
  host?: string;
  port?: number;
  clientId?: string | (() => string);
}

const defaultOptions: ExtractOptional<BridgeClientOptions> = {
  host: 'localhost',
  port: 23191,
  clientId: () => (world.getDynamicProperty('clientId') as string) ?? 'discord-mcbe-bds',
};

export class BridgeClient extends BaseClient<ServerNetBridgeClient> {
  readonly type = ClientType.BDS;

  constructor(options: BridgeClientOptions = {}) {
    const mergedOptions = { ...defaultOptions, ...options };

    const bridge = new ServerNetBridgeClient({
      url: `ws://${mergedOptions.host}:${mergedOptions.port}`,
      clientId: mergedOptions.clientId,
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
