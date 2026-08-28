import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { WebSocket, WebSocketServer } from 'ws';
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
  NamespaceRequiredError,
} from '@discord-mcbe/shared';

import type { RawData } from 'ws';
import type { ClientActionHandler } from '../types';
import type { ISession } from '../interfaces';

type BdsSessionResponse<T = unknown> = BdsWebSocketResponse<T> & { sessionId: string };

export interface WebSocketBridgeServerOptions {
  port: number;
}

export class BdsWebSocketBridgeServer extends EventEmitter<BdsWebSocketServerEvents> {
  static readonly PROTOCOL_VERSION = BdsWebSocketBridge.PROTOCOL_VERSION;

  readonly port: number;
  readonly sessions = new Set<BdsWebSocketSession>();

  private readonly actionHandlers = new Map<string, ClientActionHandler<BaseAction>>();
  private server: WebSocketServer | null = null;

  constructor(options: WebSocketBridgeServerOptions) {
    super();
    this.port = options.port;
  }

  start(): Promise<void> {
    if (this.server) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const server = new WebSocketServer({ port: this.port });
      this.server = server;

      const onStartupError = (error: Error) => {
        server.off('listening', onListening);
        this.server = null;
        reject(error);
      };
      const onListening = () => {
        server.off('error', onStartupError);
        server.on('error', (error) => this.emit('error', error));
        this.emit('serverOpen');
        resolve();
      };

      server.once('error', onStartupError);
      server.once('listening', onListening);
      server.on('connection', (socket) => this.onConnection(socket));
    });
  }

  async stop(): Promise<void> {
    const server = this.server;
    if (!server) return;

    await Promise.allSettled([...this.sessions].map((session) => session.disconnect()));
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    this.server = null;
    this.emit('serverClose');
  }

  broadcast<A extends BaseAction = BaseAction>(
    channelId: A['id'],
    data?: A['request'],
    timeout?: number,
  ): Promise<BdsSessionResponse<A['response']>[]> {
    return Promise.all(
      [...this.sessions]
        .filter((session) => session.isConnected)
        .map((session) => session.send<A>(channelId, data, timeout)),
    );
  }

  registerHandler<A extends BaseAction = BaseAction>(
    channelId: A['id'],
    handler: ClientActionHandler<A>,
  ): void {
    if (!channelId.includes(':')) throw new NamespaceRequiredError(channelId);
    if (this.actionHandlers.has(channelId)) {
      process.emitWarning(`[BdsWebSocketBridge] Overwriting handler for channel: ${channelId}`);
    }
    this.actionHandlers.set(channelId, handler as unknown as ClientActionHandler<BaseAction>);
  }

  private onConnection(socket: WebSocket): void {
    const session = new BdsWebSocketSession(this, socket);
    this.sessions.add(session);

    socket.on('message', (data, isBinary) => {
      if (isBinary) {
        session.sendPayload(
          this.errorResponse('', ResponseErrorReason.InvalidPayload, 'Binary payloads are not supported'),
        );
        return;
      }
      this.onMessage(session, data).catch((error) => this.emit('error', error as Error));
    });
    socket.on('close', () => {
      if (session.isDestroyed) return;
      if (session.isConnected) {
        this.emit('clientDisconnect', session, session.disconnectReason ?? DisconnectReason.ConnectionLost);
      }
      session.destroy();
    });
    socket.on('error', (error) => this.emit('error', error));
  }

  private async onMessage(session: BdsWebSocketSession, rawData: RawData): Promise<void> {
    let parsed: unknown;
    try {
      const rawMessage = Array.isArray(rawData)
        ? Buffer.concat(rawData).toString()
        : rawData instanceof ArrayBuffer
          ? Buffer.from(new Uint8Array(rawData)).toString()
          : rawData.toString();
      parsed = JSON.parse(rawMessage);
    } catch {
      session.sendPayload(this.errorResponse('', ResponseErrorReason.InvalidPayload, 'Invalid JSON payload'));
      return;
    }

    if (!isBdsWebSocketPayload(parsed)) {
      session.sendPayload(
        this.errorResponse('', ResponseErrorReason.InvalidPayload, 'Invalid WebSocket payload'),
      );
      return;
    }
    const payload = parsed;

    if (payload.type === PayloadType.Response) {
      session.handleResponse(payload);
      return;
    }

    let disconnectReason: DisconnectReason | null = null;
    if (payload.channelId === InternalAction.Disconnect) {
      const reason = (payload.data as { reason?: unknown } | undefined)?.reason;
      if (typeof reason !== 'number' || DisconnectReason[reason] === undefined) {
        session.sendPayload(
          this.errorResponse(
            payload.requestId,
            ResponseErrorReason.InvalidPayload,
            'Invalid disconnect payload',
          ),
        );
        return;
      }
      disconnectReason = reason;
    }

    const response = await this.handleRequest(session, payload);
    session.sendPayload(response);

    if (disconnectReason !== null && !response.error && session.isConnected) {
      this.emit('clientDisconnect', session, disconnectReason);
      session.destroy();
    }
  }

  private async handleRequest(
    session: BdsWebSocketSession,
    request: BdsWebSocketRequest,
  ): Promise<BdsWebSocketResponse> {
    if (request.channelId === InternalAction.Connect) return this.handleConnect(session, request);

    if (!session.isConnected) {
      return this.errorResponse(
        request.requestId,
        ResponseErrorReason.InvalidSession,
        'WebSocket handshake has not completed',
      );
    }

    if (request.channelId === InternalAction.Disconnect) {
      return this.successResponse(request.requestId, undefined);
    }

    const handler = this.actionHandlers.get(request.channelId);
    if (!handler) {
      return this.errorResponse(
        request.requestId,
        ResponseErrorReason.UnhandledRequest,
        `No handler found for channel: ${request.channelId}`,
      );
    }

    try {
      let data: unknown;
      await handler({
        data: request.data,
        session,
        respond: (responseData) => {
          data = responseData;
        },
      });
      return this.successResponse(request.requestId, data);
    } catch (error) {
      this.emit('error', error as Error);
      return this.errorResponse(
        request.requestId,
        ResponseErrorReason.InternalError,
        `An error occurred while handling the request\n${String(error)}`,
      );
    }
  }

  private handleConnect(
    session: BdsWebSocketSession,
    request: BdsWebSocketRequest,
  ): BdsWebSocketResponse<{ sessionId: string }> {
    if (session.isConnected) {
      return this.errorResponse(
        request.requestId,
        ResponseErrorReason.InvalidSession,
        'Session is already connected',
      );
    }

    const data = request.data as ConnectAction['request'] | undefined;
    if (!data || typeof data.clientId !== 'string' || typeof data.protocolVersion !== 'number') {
      return this.errorResponse(
        request.requestId,
        ResponseErrorReason.InvalidPayload,
        'Invalid connection payload',
      );
    }

    if (data.protocolVersion !== BdsWebSocketBridgeServer.PROTOCOL_VERSION) {
      const reason =
        data.protocolVersion > BdsWebSocketBridgeServer.PROTOCOL_VERSION
          ? DisconnectReason.OutdatedServer
          : DisconnectReason.OutdatedClient;
      return this.errorResponse(
        request.requestId,
        ResponseErrorReason.InvalidPayload,
        DisconnectReason[reason],
      );
    }

    session.connect(data.clientId);
    this.emit('clientConnect', session);
    return this.successResponse(request.requestId, { sessionId: session.id });
  }

  private successResponse<T>(requestId: string, data: T): BdsWebSocketResponse<T> {
    return {
      type: PayloadType.Response,
      error: false,
      data,
      requestId,
    };
  }

  private errorResponse(
    requestId: string,
    errorReason: ResponseErrorReason,
    message: string,
  ): BdsWebSocketResponse<never> {
    return {
      type: PayloadType.Response,
      error: true,
      errorReason,
      message,
      requestId,
    };
  }
}

export class BdsWebSocketSession implements ISession {
  readonly id = randomUUID();
  readonly _awaitingResponses = new Map<
    string,
    { resolve: (response: BdsSessionResponse) => void; sentAt: number; timeout: NodeJS.Timeout }
  >();

  clientId = '';
  isConnected = false;
  isDestroyed = false;
  disconnectReason: DisconnectReason | null = null;

  private readonly deltaTimes: number[] = [];
  private readonly handshakeTimeout: NodeJS.Timeout;

  constructor(
    private readonly server: BdsWebSocketBridgeServer,
    private readonly socket: WebSocket,
  ) {
    this.handshakeTimeout = setTimeout(() => this.destroy(), 10_000);
  }

  get averagePing(): number {
    if (this.deltaTimes.length === 0) return -1;
    return this.deltaTimes.reduce((sum, value) => sum + value, 0) / this.deltaTimes.length;
  }

  connect(clientId: string): void {
    clearTimeout(this.handshakeTimeout);
    this.clientId = clientId;
    this.isConnected = true;
  }

  async disconnect(reason: DisconnectReason = DisconnectReason.Disconnect): Promise<void> {
    if (this.isDestroyed) return;
    this.disconnectReason = reason;

    try {
      if (this.isConnected) {
        await this.send<InternalActions.Disconnect>(InternalAction.Disconnect, { reason }, 5_000);
      }
    } finally {
      if (!this.isDestroyed) {
        if (this.isConnected) this.server.emit('clientDisconnect', this, reason);
        this.destroy();
      }
    }
  }

  destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    clearTimeout(this.handshakeTimeout);

    for (const [requestId, pending] of this._awaitingResponses) {
      clearTimeout(pending.timeout);
      pending.resolve({
        type: PayloadType.Response,
        error: true,
        errorReason: ResponseErrorReason.Abort,
        message: 'Session disconnected',
        sessionId: this.id,
        requestId,
      });
    }
    this._awaitingResponses.clear();
    this.server.sessions.delete(this);

    if (this.socket.readyState === WebSocket.OPEN) this.socket.close();
    if (this.isConnected) this.server.emit('sessionDestroy', this);
    this.isConnected = false;
  }

  send<A extends BaseAction = BaseAction>(
    channelId: A['id'],
    data?: A['request'],
    timeout: number = 10_000,
  ): Promise<BdsSessionResponse<A['response']>> {
    if (!channelId.includes(':')) throw new NamespaceRequiredError(channelId);
    if (!this.isConnected || this.isDestroyed) throw new Error('No active WebSocket session');

    const requestId = randomUUID();
    const payload: BdsWebSocketRequest<A['request']> = {
      type: PayloadType.Request,
      channelId,
      requestId,
      data,
    };
    return new Promise((resolve, reject) => {
      const pending = {
        resolve: resolve as (response: BdsSessionResponse) => void,
        sentAt: Date.now(),
        timeout: setTimeout(() => {
          this._awaitingResponses.delete(requestId);
          resolve({
            type: PayloadType.Response,
            error: true,
            errorReason: ResponseErrorReason.Timeout,
            message: 'Request timed out',
            sessionId: this.id,
            requestId,
          });
        }, timeout),
      };

      this._awaitingResponses.set(requestId, pending);
      try {
        this.sendPayload(payload);
      } catch (error) {
        clearTimeout(pending.timeout);
        this._awaitingResponses.delete(requestId);
        reject(error as Error);
      }
    });
  }

  handleResponse(response: BdsWebSocketResponse): void {
    const pending = this._awaitingResponses.get(response.requestId);
    if (!pending) return;

    clearTimeout(pending.timeout);
    this._awaitingResponses.delete(response.requestId);
    this.deltaTimes.push(Date.now() - pending.sentAt);
    if (this.deltaTimes.length > 10) this.deltaTimes.shift();
    pending.resolve({ ...response, sessionId: this.id });
  }

  sendPayload(payload: BdsWebSocketPayload): void {
    if (this.socket.readyState !== WebSocket.OPEN) throw new Error('WebSocket is not open');
    this.socket.send(JSON.stringify(payload));
  }
}

interface BdsWebSocketServerEvents {
  serverOpen: [];
  serverClose: [];
  clientConnect: [session: BdsWebSocketSession];
  clientDisconnect: [session: BdsWebSocketSession, reason: DisconnectReason];
  sessionDestroy: [session: BdsWebSocketSession];
  error: [error: Error];
}
