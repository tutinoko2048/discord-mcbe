import { system } from '@minecraft/server';
import {
  websocket,
  type WebSocketClient,
  type WebSocketClientCloseAfterEvent,
  type WebSocketClientReceiveAfterEvent,
} from '@minecraft/server-net';
import {
  type ServerBoundNotificationPacket,
  type ServerBoundRequestInput,
  type ServerBoundRequestPacket,
  DisconnectReason,
  errorResponse,
  InternalAction,
  PendingRequests,
  RESPONSE_PACKET_TYPE,
  type RequestResult,
  type ResponseData,
  ResponseErrorReason,
  safeParseResponseData,
  safeParseClientBoundPacket,
  SERVER_NET_BRIDGE_PROTOCOL_VERSION,
  type ClientBoundRequestPacket,
  successResponse,
} from '@discord-mcbe/shared';
import { Emitter } from '../utils/emitter';
import type { ClientBoundRequestHandler, IBridgeClient } from './interfaces';

interface ServerNetBridgeEvents {
  connect: { sessionId: string };
  disconnect: { reason: DisconnectReason };
}

export interface ServerNetBridgeClientOptions {
  url: string;
  worldName: string | (() => string);
  handleRequest: ClientBoundRequestHandler;
}

class ProtocolVersionError extends Error {}

export class ServerNetBridgeClient extends Emitter<ServerNetBridgeEvents> implements IBridgeClient {
  static readonly PROTOCOL_VERSION = SERVER_NET_BRIDGE_PROTOCOL_VERSION;

  private readonly pending = new PendingRequests<number>({
    set: (callback, ticks) => system.runTimeout(callback, ticks),
    clear: (timer) => system.clearRun(timer),
  });
  private readonly maxReconnectAttempts = 10;

  private socket: WebSocketClient | null = null;
  private currentSessionId: string | null = null;
  private previousRequestId = 0;
  private connecting: Promise<void> | null = null;
  private closeReason: DisconnectReason | null = null;

  constructor(private readonly options: ServerNetBridgeClientOptions) {
    super();
  }

  get isConnected(): boolean {
    return this.socket?.isOpen === true && this.currentSessionId !== null;
  }

  get worldName(): string {
    return typeof this.options.worldName === 'function' ? this.options.worldName() : this.options.worldName;
  }

  connect(): Promise<void> {
    if (this.isConnected) return Promise.resolve();
    if (this.connecting) return this.connecting;
    this.connecting = this.connectWithRetry().finally(() => {
      this.connecting = null;
    });
    return this.connecting;
  }

  request(packet: ServerBoundRequestInput): Promise<RequestResult<unknown>> {
    const socket = this.socket;
    if (!socket?.isOpen) throw new Error('WebSocket is not connected');
    if (packet.type !== InternalAction.Connect && !this.currentSessionId)
      throw new Error('No active session');

    const requestId = `${this.currentSessionId ?? 'connect'}:${++this.previousRequestId}`;
    const request = { ...packet, requestId } as ServerBoundRequestPacket;
    return this.pending.request(packet.type, requestId, 200, () => socket.send(JSON.stringify(request)));
  }

  notify(packet: ServerBoundNotificationPacket): void {
    if (!this.isConnected || !this.socket) return;
    this.socket.send(JSON.stringify(packet));
  }

  async disconnect(reason: DisconnectReason = DisconnectReason.Disconnect): Promise<void> {
    if (!this.isConnected) return;
    this.closeReason = reason;
    try {
      await this.request({ type: InternalAction.Disconnect, data: { reason } });
    } catch (error) {
      console.warn('[ServerNet] Failed to send disconnect message:', error);
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
        if (error instanceof ProtocolVersionError) throw error;
        if (attempt >= this.maxReconnectAttempts) {
          throw new Error('Max reconnect attempts reached', { cause: error });
        }
        const backoffSeconds = Math.min(2 ** attempt, 60);
        attempt++;
        console.error(
          `[ServerNet] Connection failed. Retrying in ${backoffSeconds} seconds ` +
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

    const response = await this.request({
      type: InternalAction.Connect,
      data: {
        worldName: this.worldName,
        protocolVersion: ServerNetBridgeClient.PROTOCOL_VERSION,
      },
    });
    if (response.error) {
      if (
        response.errorReason === ResponseErrorReason.InvalidPayload &&
        (response.message === DisconnectReason[DisconnectReason.OutdatedClient] ||
          response.message === DisconnectReason[DisconnectReason.OutdatedServer])
      ) {
        throw new ProtocolVersionError(response.message);
      }
      throw new Error(response.message);
    }
    const data = response.data as ResponseData<InternalAction.Connect>;
    this.currentSessionId = data.sessionId;
    this.emit('connect', { sessionId: data.sessionId });
  }

  private onMessage(socket: WebSocketClient, event: WebSocketClientReceiveAfterEvent): void {
    if (socket !== this.socket) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(event.message);
    } catch (error) {
      console.error('[ServerNet] Failed to parse message:', error);
      return;
    }

    const result = safeParseClientBoundPacket(parsed);
    if (!result.success) {
      console.error('[ServerNet] Invalid WebSocket packet:', result.issues);
      this.respondToInvalidRequest(socket, parsed);
      return;
    }

    if (result.output.type === RESPONSE_PACKET_TYPE) {
      this.pending.handle(result.output);
      return;
    }

    void this.handleRequest(socket, result.output);
  }

  private async handleRequest(socket: WebSocketClient, request: ClientBoundRequestPacket): Promise<void> {
    let data: unknown;
    let disconnectReason: DisconnectReason | null = null;

    try {
      if (request.type === InternalAction.Ping) {
        data = { receivedAt: Date.now() };
      } else if (request.type === InternalAction.Disconnect) {
        disconnectReason = request.data.reason;
        data = null;
      } else {
        data = (await this.options.handleRequest(request)).data;
      }

      const parsed = safeParseResponseData(request.type, data);
      const response = parsed.success
        ? successResponse(request.requestId, parsed.output)
        : errorResponse(
            request.requestId,
            ResponseErrorReason.InvalidPayload,
            `Invalid response data for ${request.type}`,
          );
      if (socket.isOpen) socket.send(JSON.stringify(response));
    } catch (error) {
      if (socket.isOpen) {
        socket.send(
          JSON.stringify(
            errorResponse(
              request.requestId,
              ResponseErrorReason.InternalError,
              `An error occurred while handling ${request.type}\n${String(error)}`,
            ),
          ),
        );
      }
    }

    if (disconnectReason !== null) {
      this.closeReason = disconnectReason;
      this.closeSocket();
    }
  }

  private respondToInvalidRequest(socket: WebSocketClient, input: unknown): void {
    if (typeof input !== 'object' || input === null) return;
    const record = input as Record<string, unknown>;
    if (record.type === RESPONSE_PACKET_TYPE) return;
    const requestId = record.requestId;
    if (typeof requestId !== 'string' || !socket.isOpen) return;
    socket.send(
      JSON.stringify(errorResponse(requestId, ResponseErrorReason.InvalidPayload, 'Invalid request packet')),
    );
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
        this.connect().catch((error) => console.error('[ServerNet] Reconnection failed:', error));
      });
    }
  }

  private closeSocket(reset: boolean = false): void {
    const socket = this.socket;
    if (reset) this.resetConnection();
    if (socket?.isOpen) socket.close();
    else if (!reset) this.resetConnection();
  }

  private resetConnection(): void {
    this.socket = null;
    this.currentSessionId = null;
    this.previousRequestId = 0;
    this.pending.abortAll('WebSocket disconnected before response was received');
  }

  private wait(ticks: number): Promise<void> {
    return new Promise((resolve) => system.runTimeout(resolve, ticks));
  }
}
