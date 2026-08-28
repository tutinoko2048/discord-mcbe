import { EventEmitter } from 'node:events';
import { WebSocket, WebSocketServer } from 'ws';
import {
  ServerNetBridge,
  isServerNetPayload,
  type ServerNetRequest,
  type ServerNetResponse,
  DisconnectReason,
  InternalAction,
  PayloadType,
  ResponseErrorReason,
  type BaseAction,
  type ConnectAction,
  NamespaceRequiredError,
} from '@discord-mcbe/shared';

import type { RawData } from 'ws';
import type { ClientActionHandler } from '../types';
import { ServerNetSessionResponse, ServerNetSession } from './session';

export interface ServerNetBridgeOptions {
  port: number;
}

export class ServerNetBridgeServer extends EventEmitter<ServerNetBridgeEvents> {
  static readonly PROTOCOL_VERSION = ServerNetBridge.PROTOCOL_VERSION;

  readonly port: number;
  readonly sessions = new Set<ServerNetSession>();

  private readonly actionHandlers = new Map<string, ClientActionHandler<BaseAction>>();
  private server: WebSocketServer | null = null;

  constructor(options: ServerNetBridgeOptions) {
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
  ): Promise<ServerNetSessionResponse<A['response']>[]> {
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
      process.emitWarning(`[ServerNetBridge] Overwriting handler for channel: ${channelId}`);
    }
    this.actionHandlers.set(channelId, handler as unknown as ClientActionHandler<BaseAction>);
  }

  private onConnection(socket: WebSocket): void {
    const session = new ServerNetSession(this, socket);
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

  private async onMessage(session: ServerNetSession, rawData: RawData): Promise<void> {
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

    if (!isServerNetPayload(parsed)) {
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
    session: ServerNetSession,
    request: ServerNetRequest,
  ): Promise<ServerNetResponse> {
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
    session: ServerNetSession,
    request: ServerNetRequest,
  ): ServerNetResponse<{ sessionId: string }> {
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

    if (data.protocolVersion !== ServerNetBridgeServer.PROTOCOL_VERSION) {
      const reason =
        data.protocolVersion > ServerNetBridgeServer.PROTOCOL_VERSION
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

  private successResponse<T>(requestId: string, data: T): ServerNetResponse<T> {
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
  ): ServerNetResponse<never> {
    return {
      type: PayloadType.Response,
      error: true,
      errorReason,
      message,
      requestId,
    };
  }
}

interface ServerNetBridgeEvents {
  serverOpen: [];
  serverClose: [];
  clientConnect: [session: ServerNetSession];
  clientDisconnect: [session: ServerNetSession, reason: DisconnectReason];
  sessionDestroy: [session: ServerNetSession];
  error: [error: Error];
}
