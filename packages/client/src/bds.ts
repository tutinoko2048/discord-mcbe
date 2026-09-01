import { BaseClient, ClientType } from './client';
import { ServerNetBridgeClient } from './transport/server-net';
import type { ExtractOptional } from '@discord-mcbe/shared';
import { world } from '@minecraft/server';
import { variables } from '@minecraft/server-admin';
import { handleClientBoundRequest } from './client/handler';
import * as v from 'valibot';

export interface BridgeClientOptions {
  host?: string;
  port?: number;
  worldName?: string | (() => string);
}

const BdsVariablesSchema = v.object({
  BRIDGE_HOST: v.fallback(v.pipe(v.string(), v.nonEmpty()), 'localhost'),
  BRIDGE_PORT: v.fallback(v.pipe(v.number(), v.integer(), v.minValue(1)), 23191),
  DEFAULT_CLIENT_ID: v.fallback(v.pipe(v.string(), v.nonEmpty()), 'discord-mcbe-bds'),
});

const vars = v.parse(BdsVariablesSchema, {
  BRIDGE_HOST: variables.get('BRIDGE_HOST'),
  BRIDGE_PORT: variables.get('BRIDGE_PORT'),
  DEFAULT_CLIENT_ID: variables.get('DEFAULT_CLIENT_ID'),
});

const defaultOptions: ExtractOptional<BridgeClientOptions> = {
  host: vars.BRIDGE_HOST,
  port: vars.BRIDGE_PORT,
  worldName: () => {
    const worldName = world.getDynamicProperty('worldName');
    if (typeof worldName === 'string') return worldName;
    return vars.DEFAULT_CLIENT_ID;
  },
};

export class BridgeClient extends BaseClient<ServerNetBridgeClient> {
  readonly type = ClientType.BDS;

  constructor(options: BridgeClientOptions = {}) {
    const mergedOptions = { ...defaultOptions, ...options };

    const bridge = new ServerNetBridgeClient({
      url: `ws://${mergedOptions.host}:${mergedOptions.port}`,
      worldName: mergedOptions.worldName,
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
