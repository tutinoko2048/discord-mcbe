import { ExtractOptional } from '@discord-mcbe/shared';
import { BaseClient } from './client';
import { ScriptBridgeClient } from '@script-bridge/client';

export interface BridgeClientOptions {
  host?: string;
  port?: number;
  clientId?: string;
}

const defaultOptions: ExtractOptional<BridgeClientOptions> = {
  host: 'localhost',
  port: 23191,
  clientId: 'discord-mcbe-bds',
};

export class BridgeClient extends BaseClient<ScriptBridgeClient> {
  constructor(options: BridgeClientOptions = {}) {
    const mergedOptions = { ...defaultOptions, ...options };

    const bridge = new ScriptBridgeClient({
      url: `http://${mergedOptions.host}:${mergedOptions.port}`,
      clientId: mergedOptions.clientId,
    });

    super(bridge);
  }

  async start(): Promise<void> {
    console.log('[BridgeClient] Connecting to discord-mcbe server...');
    const requestedAt = Date.now();
    await this.bridge.connect();
    console.log(`[BridgeClient] Connection established! (${Date.now() - requestedAt}ms)`);
  }
}
