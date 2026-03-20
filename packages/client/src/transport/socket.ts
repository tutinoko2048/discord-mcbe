import {
  world,
  system,
  CommandPermissionLevel,
  CustomCommandParamType,
  CustomCommandStatus,
  type StartupEvent,
  type CustomCommandResult,
} from '@minecraft/server';
import {
  SocketBridge,
  type ClientRequest,
  type ClientResponse,
  type ConnectionResponse,
  type ServerRequest,
  type ServerResponse,
  type QueryResponse,
} from '@discord-mcbe/shared';
import {
  DisconnectReason,
  InternalAction,
  type InternalActions,
  PayloadType,
  ResponseErrorReason,
  type BaseAction,
} from '@script-bridge/protocol';
import { Emitter } from '../utils/emitter';
import { Logger } from '../utils';

import type { ActionHandler } from '@script-bridge/client';
import type { IBridgeClient, IResponse } from './interfaces';

export interface SocketEvents {
  ready: {};
  connect: {
    sessionId: string;
  };
  disconnect: {
    reason: DisconnectReason;
  };
}

export interface ClientOptions {
  clientId: string | (() => string);
}

export class SocketBridgeClient extends Emitter<SocketEvents> implements IBridgeClient {
  static readonly PROTOCOL_VERSION = SocketBridge.PROTOCOL_VERSION;

  private readonly _clientId: string | (() => string);

  private readonly sendQueue: (ClientRequest | ClientResponse)[] = [];
  private readonly awaitingResponses = new Map<number, (response: ServerResponse) => void>();
  private readonly actionHandlers = new Map<string, ActionHandler<BaseAction>>();
  private readonly deltaTimes: number[] = [];

  private readonly logger = new Logger('discord-mcbe');

  private previousRequestId = 0;
  private currentSessionId: string | null = null;
  private lastQueryReceivedAt: number | null = null;

  constructor(options: ClientOptions) {
    super();

    this._clientId = options.clientId;

    system.beforeEvents.startup.subscribe(this.onStartup.bind(this));

    system.afterEvents.scriptEventReceive.subscribe(
      (event) => {
        if (event.id === 'bridge:message') this.onMessage(event.message.trim());
      },
      {
        namespaces: ['bridge'],
      },
    );

    world.afterEvents.worldLoad.subscribe(() => {
      this.emit('ready', {});
    });
  }

  get isConnected(): boolean {
    return this.currentSessionId !== null;
  }

  get clientId(): string {
    return typeof this._clientId === 'function' ? this._clientId() : this._clientId;
  }

  async send<A extends BaseAction = BaseAction>(
    channelId: A['id'],
    data?: A['request'],
  ): Promise<IResponse<A['response']>> {
    if (!this.currentSessionId) throw new Error('No active session');

    const requestId = ++this.previousRequestId;

    this.sendQueue.push({
      type: PayloadType.Request,
      channelId,
      data,
      sessionId: this.currentSessionId,
      requestId,
    });

    return new Promise((resolve) => {
      this.awaitingResponses.set(requestId, (response) => {
        resolve(response);
      });
    });
  }

  registerHandler<A extends BaseAction = BaseAction>(channelId: A['id'], handler: ActionHandler<A>): void {
    if (this.actionHandlers.has(channelId)) {
      console.warn('[SocketBridge] Overwriting existing handler for channel:', channelId);
    }
    //REVIEW - temporary cast to unknown to bypass type issue
    this.actionHandlers.set(channelId, handler as unknown as ActionHandler<BaseAction>);
  }

  async disconnect(reason: DisconnectReason = DisconnectReason.Disconnect): Promise<void> {
    try {
      await this.send<InternalActions.Disconnect>(InternalAction.Disconnect, { reason });
    } catch (e) {
      this.logger.warn('Failed to send disconnect message', e);
    }

    this.destroy();

    this.emit('disconnect', { reason });
  }

  destroy() {
    this.clearResponses();
    this.sendQueue.length = 0;
    this.deltaTimes.length = 0;
    this.lastQueryReceivedAt = null;
    this.currentSessionId = null;
  }

  private clearResponses() {
    for (const [requestId, resolve] of this.awaitingResponses.entries()) {
      resolve({
        type: PayloadType.Response,
        error: true,
        message: 'Session disconnected before response was received',
        errorReason: ResponseErrorReason.Abort,
        sessionId: this.currentSessionId!,
        requestId,
      });
    }
    this.awaitingResponses.clear();
  }

  private handleConnection(protocolVersion: number, sessionId: string): CustomCommandResult {
    let body: ConnectionResponse;

    if (SocketBridgeClient.PROTOCOL_VERSION > protocolVersion) {
      body = { error: true, errorReason: DisconnectReason.OutdatedServer };
    } else if (SocketBridgeClient.PROTOCOL_VERSION < protocolVersion) {
      body = { error: true, errorReason: DisconnectReason.OutdatedClient };
    } else {
      body = {
        protocolVersion: SocketBridgeClient.PROTOCOL_VERSION,
        clientId: this.clientId,
      };

      this.destroy();
      this.currentSessionId = sessionId;
      this.emit('connect', { sessionId });
    }

    return {
      status: CustomCommandStatus.Success,
      message: JSON.stringify(body),
    };
  }

  private async handleResponse(response: ServerResponse) {
    const { requestId } = response;
    const resolve = this.awaitingResponses.get(requestId);
    if (resolve) {
      resolve(response);
      this.awaitingResponses.delete(requestId);
    }
  }

  private async handleRequest(request: ServerRequest) {
    const { requestId, sessionId, channelId } = request;

    const handler = this.actionHandlers.get(channelId);
    if (!handler) {
      console.error('[SocketBridge] No handler for channel:', channelId);
      this.sendQueue.push({
        type: PayloadType.Response,
        error: true,
        errorReason: ResponseErrorReason.UnhandledRequest,
        message: `No handler found for channel: ${channelId}`,
        requestId,
        sessionId,
      });
      return;
    }

    try {
      await handler({
        data: request.data,
        respond: (data) => {
          this.sendQueue.push({
            type: PayloadType.Response,
            data,
            requestId,
            sessionId,
          });
        },
      });
    } catch (err) {
      console.error('[SocketBridge] Error while handling request:', channelId, err);
      this.sendQueue.push({
        type: PayloadType.Response,
        error: true,
        errorReason: ResponseErrorReason.InternalError,
        message: `An error occurred while handling the request\n${String(err)}`,
        requestId,
        sessionId,
      });
    }
  }

  private getQueue() {
    const queue = this.sendQueue.slice(); // copy the queue
    this.sendQueue.length = 0;
    return queue;
  }

  private onQuery(sessionId: string): CustomCommandResult {
    let result: QueryResponse;

    if (this.currentSessionId === sessionId) {
      result = { error: false, data: this.getQueue() };

      const now = Date.now();
      if (this.lastQueryReceivedAt !== null) {
        this.deltaTimes.push(now - this.lastQueryReceivedAt);
        if (this.deltaTimes.length > 20) this.deltaTimes.shift();
      }
      this.lastQueryReceivedAt = now;
    } else {
      result = { error: true, errorReason: ResponseErrorReason.InvalidSession };
    }

    return {
      status: CustomCommandStatus.Success,
      message: JSON.stringify(result),
    };
  }

  /** Process incoming messages from server */
  private onMessage(rawMessage: string): void {
    // console.log('Received message from bridge:', rawMessage);

    let message: ServerRequest | ServerResponse;
    try {
      message = JSON.parse(rawMessage);
    } catch (e) {
      console.error('[SocketBridge] Failed to parse message from bridge:', e);
      return;
    }

    if (message.type === PayloadType.Response) {
      this.handleResponse(message).catch((error) => {
        console.error('[SocketBridge] Failed to handle response:', error);
      });
    } else if (message.type === PayloadType.Request) {
      this.handleRequest(message).catch((error) => {
        console.error('[SocketBridge] Failed to handle request:', error);
      });
    }
  }

  /**
   * Register internal commands
   */
  private onStartup(ev: StartupEvent) {
    const registry = ev.customCommandRegistry;
    registry.registerCommand(
      {
        name: 'dmc:__query__',
        description: '§8[internal] query messages for SocketBridge',
        permissionLevel: CommandPermissionLevel.Host,
        mandatoryParameters: [
          {
            name: 'sessionId',
            type: CustomCommandParamType.String,
          },
        ],
      },
      (_, sessionId: string) => this.onQuery(sessionId),
    );

    registry.registerCommand(
      {
        name: 'dmc:__connect__',
        description: '§8[internal] initialize connection for SocketBridge',
        permissionLevel: CommandPermissionLevel.Host,
        mandatoryParameters: [
          {
            name: 'protocolVersion',
            type: CustomCommandParamType.Integer,
          },
          {
            name: 'sessionId', // sessionId is generated on server side
            type: CustomCommandParamType.String,
          },
        ],
      },
      (_, protocolVersion: number, sessionId: string) => this.handleConnection(protocolVersion, sessionId),
    );
  }
}
