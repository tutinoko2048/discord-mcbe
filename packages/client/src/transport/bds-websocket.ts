import { system } from '@minecraft/server';
import {
  websocket,
  type WebSocketClient,
  type WebSocketClientCloseAfterEvent,
  type WebSocketClientReceiveAfterEvent,
} from '@minecraft/server-net';
import {
  BdsWebSocketBridge,
  isBdsWebSocketPayload,
  type BdsWebSocketPayload,
  type BdsWebSocketRequest,
  type BdsWebSocketResponse,
  DisconnectReason,
  InternalAction,
  PayloadType,
  ResponseErrorReason,
  type BaseAction,
  type ConnectAction,
  type InternalActions,
  type ActionHandler,
} from '@discord-mcbe/shared';
import { Emitter } from '../utils/emitter';

import type { IBridgeClient, IResponse } from './interfaces';

interface WebSocketBridgeEvents {
  connect: { sessionId: string };
  disconnect: { reason: DisconnectReason };
}

export interface WebSocketBridgeClientOptions {
  url: string;
  clientId: string | (() => string);
}

interface PendingResponse {
  timeoutId: number;
  resolve: (response: BdsWebSocketResponse) => void;
}

export class WebSocketBridgeClient extends Emitter<WebSocketBridgeEvents> implements IBridgeClient {
  static readonly PROTOCOL_VERSION = BdsWebSocketBridge.PROTOCOL_VERSION;

  private readonly actionHandlers = new Map<string, ActionHandler<BaseAction>>();
  private readonly awaitingResponses = new Map<string, PendingResponse>();
  private readonly maxReconnectAttempts = 10;

  private socket: WebSocketClient | null = null;
  private currentSessionId: string | null = null;
  private previousRequestId = 0;
  private connecting: Promise<void> | null = null;
  private closeReason: DisconnectReason | null = null;

  constructor(private readonly options: WebSocketBridgeClientOptions) {
    super();
  }

  get isConnected(): boolean {
    return this.socket?.isOpen === true && this.currentSessionId !== null;
  }

  get clientId(): string {
    return typeof this.options.clientId === 'function' ? this.options.clientId() : this.options.clientId;
  }

  connect(): Promise<void> {
    if (this.isConnected) return Promise.resolve();
    if (this.connecting) return this.connecting;

    this.connecting = this.connectWithRetry().finally(() => {
      this.connecting = null;
    });
    return this.connecting;
  }

  async send<A extends BaseAction = BaseAction>(
    channelId: A['id'],
    data?: A['request'],
  ): Promise<IResponse<A['response']>> {
    if (!this.isConnected) throw new Error('No active session');
    return await this.request<A['response']>(channelId, data);
  }

  registerHandler<A extends BaseAction = BaseAction>(channelId: A['id'], handler: ActionHandler<A>): void {
    if (!channelId.includes(':')) throw new Error(`Channel ID "${channelId}" must include a namespace`);
    if (this.actionHandlers.has(channelId)) {
      console.warn('[BdsWebSocket] Overwriting existing handler for channel:', channelId);
    }
    this.actionHandlers.set(channelId, handler as unknown as ActionHandler<BaseAction>);
  }

  async disconnect(reason: DisconnectReason = DisconnectReason.Disconnect): Promise<void> {
    if (!this.isConnected) return;

    this.closeReason = reason;
    try {
      await this.send<InternalActions.Disconnect>(InternalAction.Disconnect, { reason });
    } catch (error) {
      console.warn('[BdsWebSocket] Failed to send disconnect message:', error);
    } finally {
      this.closeSocket();
    }
  }

  private async connectWithRetry(): Promise<void> {
    let attempt = 0;

    while (!this.isConnected) {
      try {
        await this.connectOnce();
        return;
      } catch (error) {
        this.closeSocket(false);
        if (attempt >= this.maxReconnectAttempts) {
          throw new Error('Max reconnect attempts reached', { cause: error });
        }

        const backoffSeconds = Math.min(2 ** attempt, 60);
        attempt++;
        console.error(
          `[BdsWebSocket] Connection failed. Retrying in ${backoffSeconds} seconds ` +
            `(attempt ${attempt}/${this.maxReconnectAttempts})`,
          error,
        );
        await this.wait(backoffSeconds * 20);
      }
    }
  }

  private async connectOnce(): Promise<void> {
    const socket = await websocket.connect(this.options.url);
    this.socket = socket;
    this.closeReason = null;

    socket.afterEvents.message.subscribe((event) => this.onMessage(socket, event));
    socket.afterEvents.close.subscribe((event) => this.onClose(socket, event));

    const response = await this.request<{ sessionId: string }, ConnectAction['request']>(
      InternalAction.Connect,
      {
        clientId: this.clientId,
        protocolVersion: WebSocketBridgeClient.PROTOCOL_VERSION,
      },
    );

    if (response.error) throw new Error(response.message);
    const { sessionId } = response.data;
    this.currentSessionId = sessionId;
    this.emit('connect', { sessionId });
  }

  private request<Response, Request = unknown>(
    channelId: string,
    data?: Request,
    timeoutTicks: number = 200,
  ): Promise<BdsWebSocketResponse<Response>> {
    const socket = this.socket;
    if (!socket?.isOpen) throw new Error('WebSocket is not connected');

    const requestId = String(++this.previousRequestId);
    const payload: BdsWebSocketRequest<Request> = {
      type: PayloadType.Request,
      channelId,
      requestId,
      data,
    };

    return new Promise((resolve, reject) => {
      const timeoutId = system.runTimeout(() => {
        this.awaitingResponses.delete(requestId);
        resolve({
          type: PayloadType.Response,
          error: true,
          errorReason: ResponseErrorReason.Timeout,
          message: `Request timed out: ${channelId}`,
          requestId,
        });
      }, timeoutTicks);

      this.awaitingResponses.set(requestId, {
        timeoutId,
        resolve: resolve as (response: BdsWebSocketResponse) => void,
      });
      try {
        socket.send(JSON.stringify(payload));
      } catch (error) {
        system.clearRun(timeoutId);
        this.awaitingResponses.delete(requestId);
        reject(error as Error);
      }
    });
  }

  private onMessage(socket: WebSocketClient, event: WebSocketClientReceiveAfterEvent): void {
    if (socket !== this.socket) return;

    let payload: BdsWebSocketPayload;
    try {
      const parsed: unknown = JSON.parse(event.message);
      if (!isBdsWebSocketPayload(parsed)) throw new Error('Invalid WebSocket payload');
      payload = parsed;
    } catch (error) {
      console.error('[BdsWebSocket] Failed to parse message:', error);
      return;
    }

    if (payload.type === PayloadType.Response) {
      this.handleResponse(payload);
    } else if (payload.type === PayloadType.Request) {
      this.handleRequest(socket, payload).catch((error) => {
        console.error('[BdsWebSocket] Failed to handle request:', error);
      });
    }
  }

  private handleResponse(response: BdsWebSocketResponse): void {
    const pending = this.awaitingResponses.get(response.requestId);
    if (!pending) return;

    system.clearRun(pending.timeoutId);
    this.awaitingResponses.delete(response.requestId);
    pending.resolve(response);
  }

  private async handleRequest(socket: WebSocketClient, request: BdsWebSocketRequest): Promise<void> {
    let response: BdsWebSocketResponse;
    let disconnectReason: DisconnectReason | null = null;

    if (request.channelId === InternalAction.Ping) {
      response = this.successResponse(request.requestId, { receivedAt: Date.now() });
    } else if (request.channelId === InternalAction.Disconnect) {
      disconnectReason = (request.data as InternalActions.Disconnect['request']).reason;
      response = this.successResponse(request.requestId, undefined);
    } else {
      const handler = this.actionHandlers.get(request.channelId);
      if (!handler) {
        response = {
          type: PayloadType.Response,
          error: true,
          errorReason: ResponseErrorReason.UnhandledRequest,
          message: `No handler found for channel: ${request.channelId}`,
          requestId: request.requestId,
        };
      } else {
        try {
          let data: unknown;
          await handler({
            data: request.data,
            respond: (responseData) => {
              data = responseData;
            },
          });
          response = this.successResponse(request.requestId, data);
        } catch (error) {
          response = {
            type: PayloadType.Response,
            error: true,
            errorReason: ResponseErrorReason.InternalError,
            message: `An error occurred while handling the request\n${String(error)}`,
            requestId: request.requestId,
          };
        }
      }
    }

    if (socket.isOpen) socket.send(JSON.stringify(response));
    if (disconnectReason !== null) {
      this.closeReason = disconnectReason;
      this.closeSocket();
    }
  }

  private successResponse<T>(requestId: string, data: T): BdsWebSocketResponse<T> {
    return {
      type: PayloadType.Response,
      error: false,
      data,
      requestId,
    };
  }

  private onClose(socket: WebSocketClient, _event: WebSocketClientCloseAfterEvent): void {
    if (socket !== this.socket) return;

    const wasConnected = this.currentSessionId !== null;
    const reason = this.closeReason ?? DisconnectReason.ConnectionLost;
    this.resetConnection();

    if (!wasConnected) return;
    this.emit('disconnect', { reason });

    if (reason === DisconnectReason.ConnectionLost) {
      system.run(() => {
        this.connect().catch((error) => {
          console.error('[BdsWebSocket] Reconnection failed:', error);
        });
      });
    }
  }

  private closeSocket(reset: boolean = false): void {
    const socket = this.socket;
    if (reset) this.resetConnection();
    if (socket?.isOpen) {
      socket.close();
    } else if (!reset) {
      this.resetConnection();
    }
  }

  private resetConnection(): void {
    this.socket = null;
    this.currentSessionId = null;
    this.previousRequestId = 0;
    this.clearResponses();
  }

  private clearResponses(): void {
    for (const [requestId, pending] of this.awaitingResponses) {
      system.clearRun(pending.timeoutId);
      pending.resolve({
        type: PayloadType.Response,
        error: true,
        errorReason: ResponseErrorReason.Abort,
        message: 'WebSocket disconnected before response was received',
        requestId,
      });
    }
    this.awaitingResponses.clear();
  }

  private wait(ticks: number): Promise<void> {
    return new Promise((resolve) => system.runTimeout(resolve, ticks));
  }
}
