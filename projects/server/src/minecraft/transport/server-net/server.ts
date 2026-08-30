import { EventEmitter } from 'node:events';
import { WebSocket, WebSocketServer, type RawData } from 'ws';
import {
  type ServerBoundNotificationPacket,
  type ServerBoundRequestPacket,
  DisconnectReason,
  errorResponse,
  InternalAction,
  RESPONSE_PACKET_TYPE,
  type RequestResult,
  type ResponseData,
  ResponseErrorReason,
  safeParseServerBoundPacket,
  safeParseResponseData,
  SERVER_NET_BRIDGE_PROTOCOL_VERSION,
  type ClientBoundRequestData,
  type ClientBoundRequestType,
  type ClientBoundResponseData,
  successResponse,
} from '@discord-mcbe/shared';
import type { ServerBoundPacketHandler } from '../types';
import { ServerNetSession } from './session';

export interface ServerNetBridgeOptions {
  port: number;
  handlePacket: ServerBoundPacketHandler;
}

export class ServerNetBridgeServer extends EventEmitter<ServerNetBridgeEvents> {
  static readonly PROTOCOL_VERSION = SERVER_NET_BRIDGE_PROTOCOL_VERSION;

  readonly port: number;
  readonly sessions = new Set<ServerNetSession>();

  private readonly handlePacket: ServerBoundPacketHandler;
  private server: WebSocketServer | null = null;

  constructor(options: ServerNetBridgeOptions) {
    super();
    this.port = options.port;
    this.handlePacket = options.handlePacket;
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

  broadcast<T extends ClientBoundRequestType>(
    type: T,
    data: ClientBoundRequestData<T>,
    timeout?: number,
  ): Promise<RequestResult<ClientBoundResponseData<T>>[]> {
    return Promise.all(
      [...this.sessions]
        .filter((session) => session.isConnected)
        .map((session) => session.send(type, data, timeout)),
    );
  }

  private onConnection(socket: WebSocket): void {
    const session = new ServerNetSession(this, socket);
    this.sessions.add(session);
    socket.on('message', (data, isBinary) => {
      if (isBinary) {
        session.sendPayload(
          errorResponse('', ResponseErrorReason.InvalidPayload, 'Binary payloads are not supported'),
        );
        return;
      }
      void this.onMessage(session, data);
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
      parsed = JSON.parse(rawDataToString(rawData));
    } catch {
      session.sendPayload(errorResponse('', ResponseErrorReason.InvalidPayload, 'Invalid JSON payload'));
      return;
    }

    const result = safeParseServerBoundPacket(parsed);
    if (!result.success) {
      if (getPacketType(parsed) === RESPONSE_PACKET_TYPE) return;
      const requestId = getRequestId(parsed);
      session.sendPayload(
        errorResponse(requestId ?? '', ResponseErrorReason.InvalidPayload, 'Invalid WebSocket packet'),
      );
      return;
    }

    const packet = result.output;
    if (packet.type === RESPONSE_PACKET_TYPE) {
      session.handleResponse(packet);
      return;
    }

    await session.enqueueIncomingTask(() =>
      'requestId' in packet ? this.handleRequest(session, packet) : this.handleNotification(session, packet),
    );
  }

  private async handleNotification(
    session: ServerNetSession,
    notification: ServerBoundNotificationPacket,
  ): Promise<void> {
    if (!session.isConnected) return;
    try {
      await this.handlePacket(session, notification);
    } catch (error) {
      this.emit('error', error as Error);
    }
  }

  private async handleRequest(session: ServerNetSession, request: ServerBoundRequestPacket): Promise<void> {
    if (request.type === InternalAction.Connect) {
      session.sendPayload(this.handleConnect(session, request));
      return;
    }

    if (!session.isConnected) {
      session.sendPayload(
        errorResponse(
          request.requestId,
          ResponseErrorReason.InvalidSession,
          'WebSocket handshake has not completed',
        ),
      );
      return;
    }

    try {
      let data: unknown;
      if (request.type === InternalAction.Disconnect) data = null;
      else data = await this.handlePacket(session, request);

      const parsed = safeParseResponseData(request.type, data);
      session.sendPayload(
        parsed.success
          ? successResponse(request.requestId, parsed.output)
          : errorResponse(
              request.requestId,
              ResponseErrorReason.InvalidPayload,
              `Invalid response data for ${request.type}`,
            ),
      );

      if (request.type === InternalAction.Disconnect && parsed.success && session.isConnected) {
        this.emit('clientDisconnect', session, request.data.reason);
        session.destroy();
      }
    } catch (error) {
      this.emit('error', error as Error);
      session.sendPayload(
        errorResponse(
          request.requestId,
          ResponseErrorReason.InternalError,
          `An error occurred while handling ${request.type}\n${String(error)}`,
        ),
      );
    }
  }

  private handleConnect(
    session: ServerNetSession,
    request: Extract<ServerBoundRequestPacket, { type: InternalAction.Connect }>,
  ) {
    if (session.isConnected) {
      return errorResponse(
        request.requestId,
        ResponseErrorReason.InvalidSession,
        'Session is already connected',
      );
    }
    if (request.data.protocolVersion !== ServerNetBridgeServer.PROTOCOL_VERSION) {
      const reason =
        request.data.protocolVersion > ServerNetBridgeServer.PROTOCOL_VERSION
          ? DisconnectReason.OutdatedServer
          : DisconnectReason.OutdatedClient;
      return errorResponse(request.requestId, ResponseErrorReason.InvalidPayload, DisconnectReason[reason]);
    }
    session.connect(request.data.clientId);
    this.emit('clientConnect', session);
    return successResponse(request.requestId, {
      sessionId: session.id,
    } satisfies ResponseData<InternalAction.Connect>);
  }
}

function rawDataToString(data: RawData): string {
  if (Array.isArray(data)) return Buffer.concat(data).toString();
  if (data instanceof ArrayBuffer) return Buffer.from(new Uint8Array(data)).toString();
  return data.toString();
}

function getRequestId(input: unknown): string | undefined {
  if (typeof input !== 'object' || input === null) return undefined;
  const requestId = (input as Record<string, unknown>).requestId;
  return typeof requestId === 'string' ? requestId : undefined;
}

function getPacketType(input: unknown): unknown {
  if (typeof input !== 'object' || input === null) return undefined;
  return (input as Record<string, unknown>).type;
}

interface ServerNetBridgeEvents {
  serverOpen: [];
  serverClose: [];
  clientConnect: [session: ServerNetSession];
  clientDisconnect: [session: ServerNetSession, reason: DisconnectReason];
  sessionDestroy: [session: ServerNetSession];
  error: [error: Error];
}
