import { ExtractOptional } from '@discord-mcbe/shared';
import { ScriptBridgeClient } from '@script-bridge/client';
import { registerHandlers } from './handler';
import { registerEvents } from './event';

export interface ClientOptions {
  host?: string;
  port?: number;
}

const defaultOptions: ExtractOptional<ClientOptions> = {
  host: 'localhost',
  port: 23191,
};

export class BridgeClient {
  public options: ClientOptions;

  //TODO: client logger
  //

  public readonly bridge: ScriptBridgeClient;

  constructor(options: ClientOptions = {}) {
    this.options = { ...defaultOptions, ...options };

    this.bridge = new ScriptBridgeClient({
      url: `http://${defaultOptions.host}:${defaultOptions.port}`,
    });

    // handle actions from server
    registerHandlers(this.bridge);
    // register events to send to server
    registerEvents(this.bridge);
  }

  async start(): Promise<void> {
    console.log('Connecting to ScriptBridge server...');
    await this.bridge.connect();
    console.log('Connected!');
  }
}
