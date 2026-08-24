import { BaseClient, ClientType } from './client';
import { WebSocketBridgeClient } from './transport';
import { ScriptBridgeClient } from '@script-bridge/client';
import type { ExtractOptional } from '@discord-mcbe/shared';
import { world } from '@minecraft/server';

export interface BridgeClientOptions {
  host?: string;
  port?: number;
  clientId?: string | (() => string);
  /** BDS transport. WebSocket is the default; polling is retained for compatibility. */
  transport?: 'websocket' | 'polling';
}

const defaultOptions: ExtractOptional<BridgeClientOptions> = {
  host: 'localhost',
  port: 23191,
  clientId: () => (world.getDynamicProperty('clientId') as string) ?? 'discord-mcbe-bds',
  transport: 'websocket',
};

export class BridgeClient extends BaseClient<ScriptBridgeClient | WebSocketBridgeClient> {
  readonly type = ClientType.BDS;

  constructor(options: BridgeClientOptions = {}) {
    const mergedOptions = { ...defaultOptions, ...options };

    const bridge =
      mergedOptions.transport === 'polling'
        ? new ScriptBridgeClient({
            url: `http://${mergedOptions.host}:${mergedOptions.port}`,
            clientId: mergedOptions.clientId,
          })
        : new WebSocketBridgeClient({
            url: `ws://${mergedOptions.host}:${mergedOptions.port}`,
            clientId: mergedOptions.clientId,
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

export { WebSocketBridgeClient } from './transport';
