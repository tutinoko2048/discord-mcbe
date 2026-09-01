import { CommandStatusCode, type World as SocketWorld } from 'socket-be';
import {
  type ServerBoundNotificationPacket,
  type ServerBoundPacket,
  type ServerBoundRequestPacket,
  DisconnectReason,
  errorResponse,
  InternalAction,
  PendingRequests,
  RESPONSE_PACKET_TYPE,
  type RequestResult,
  ResponseErrorReason,
  safeParseServerBoundPacket,
  safeParseResponseData,
  type ClientBoundPacket,
  type ClientBoundRequestData,
  type ClientBoundRequestPacket,
  type ClientBoundRequestType,
  type ClientBoundResponseData,
  successResponse,
} from '@discord-mcbe/shared';
import { AddonNotInstalledError } from '../errors';
import { Logger } from '../../../util';
import type { ISession } from '../interfaces';
import type { WebSocketBridgeServer } from './server';
import type { Application } from '../../../application';

type QueryResponse = { error: true; errorReason: ResponseErrorReason } | { error?: false; data: unknown[] };

export class SocketSession implements ISession {
  readonly id: string;
  readonly worldName: string;
  readonly world: SocketWorld;

  private readonly pending = new PendingRequests<NodeJS.Timeout>({
    set: (callback, delay) => setTimeout(callback, delay),
    clear: (timer) => clearTimeout(timer),
  });
  private readonly logger: Logger;
  private readonly deltaTimes: number[] = [];
  private readonly requestInterval = 500;
  private readonly sentAt = new Map<string, number>();

  private previousRequestId = 0;
  private queryInterval: NodeJS.Timeout | null = null;
  private isReconnecting = false;
  private failCount = 0;

  constructor(
    private readonly app: Application,
    private readonly server: WebSocketBridgeServer,
    world: SocketWorld,
    id: string,
    worldName: string,
  ) {
    this.world = world;
    this.id = id;
    this.worldName = worldName;
    this.logger = new Logger('SocketSession', this.app.config);
    this.server.sessions.add(this);
    this.startInterval(this.requestInterval);
  }

  get averagePing(): number {
    if (this.deltaTimes.length === 0) return -1;
    return this.deltaTimes.reduce((sum, value) => sum + value, 0) / this.deltaTimes.length;
  }

  destroy(): void {
    this.pending.abortAll('Session disconnected before response was received');
    this.sentAt.clear();
    this.server.sessions.delete(this);
    this.stopInterval();
    this.deltaTimes.length = 0;
    this.previousRequestId = 0;
    this.isReconnecting = false;
    this.failCount = 0;
    this.logger.debug('Session destroyed');
    this.server.emit('sessionDestroy', this);
  }

  async disconnect(reason: DisconnectReason = DisconnectReason.Disconnect): Promise<void> {
    await this.send(InternalAction.Disconnect, { reason }, 5_000);
    this.server.emit('clientDisconnect', this, reason);
    this.destroy();
  }

  async reconnect(): Promise<void> {
    if (this.isReconnecting) {
      this.logger.warn('Already reconnecting, skipping...');
      return;
    }
    this.destroy();
    this.isReconnecting = true;
    try {
      await this.server.connect(this.world);
    } finally {
      this.isReconnecting = false;
    }
  }

  send<T extends ClientBoundRequestType>(
    type: T,
    data: ClientBoundRequestData<T>,
    timeout: number = 10_000,
  ): Promise<RequestResult<ClientBoundResponseData<T>>> {
    const requestId = `${this.id}:${++this.previousRequestId}`;
    const packet = { type, requestId, data } as ClientBoundRequestPacket;
    this.sentAt.set(requestId, Date.now());
    return this.pending
      .request(type, requestId, timeout, () => this.sendPayload(packet))
      .finally(() => this.sentAt.delete(requestId));
  }

  private async sendPayload(payload: ClientBoundPacket): Promise<void> {
    const response = await this.world.runCommand(`scriptevent bridge:message ${JSON.stringify(payload)}`);
    if (response.statusCode < CommandStatusCode.Success) throw new Error(response.statusMessage);
  }

  private handleResponse(response: Extract<ServerBoundPacket, { type: typeof RESPONSE_PACKET_TYPE }>): void {
    const sentAt = this.sentAt.get(response.requestId);
    this.sentAt.delete(response.requestId);
    if (!this.pending.handle(response) || sentAt === undefined) return;
    this.deltaTimes.push(Date.now() - sentAt);
    if (this.deltaTimes.length > 10) this.deltaTimes.shift();
  }

  private async handleRequest(request: ServerBoundRequestPacket): Promise<void> {
    try {
      let data: unknown;
      if (request.type === InternalAction.Disconnect) data = null;
      else if (request.type === InternalAction.Connect) {
        data = null;
      } else {
        data = await this.server.handlePacket(this, request);
      }

      const parsed = safeParseResponseData(request.type, data);
      await this.sendPayload(
        parsed.success
          ? successResponse(request.requestId, parsed.output)
          : errorResponse(
              request.requestId,
              ResponseErrorReason.InvalidPayload,
              `Invalid response data for ${request.type}`,
            ),
      );

      if (request.type === InternalAction.Disconnect && parsed.success) {
        this.server.emit('clientDisconnect', this, request.data.reason);
        this.destroy();
        setTimeout(() => this.world.disconnect(), 200);
      }
    } catch (error) {
      this.logger.error('Error while handling request:', request.type, error);
      await this.sendPayload(
        errorResponse(
          request.requestId,
          ResponseErrorReason.InternalError,
          `An error occurred while handling ${request.type}\n${String(error)}`,
        ),
      );
    }
  }

  private async handleNotification(notification: ServerBoundNotificationPacket): Promise<void> {
    try {
      await this.server.handlePacket(this, notification);
    } catch (error) {
      this.logger.error('Error while handling notification:', notification.type, error);
    }
  }

  private async queryData(): Promise<ServerBoundPacket[]> {
    if (!this.world.isValid) return [];
    const response = await this.world.runCommand(`dmc:__query__ ${this.id}`);
    if (response.statusCode === CommandStatusCode.FailedToParseCommand) return [];
    if (response.statusCode < CommandStatusCode.Success) throw new Error(response.statusMessage);

    let body: QueryResponse;
    try {
      body = JSON.parse(response.statusMessage) as QueryResponse;
    } catch {
      this.logger.error('Failed to parse query response');
      return [];
    }

    if (body.error) {
      if (body.errorReason === ResponseErrorReason.InvalidSession) {
        this.logger.error('Invalid session. Creating new session...');
        this.scheduleReconnect();
      } else {
        this.logger.error('[query] Unexpected error:', ResponseErrorReason[body.errorReason]);
      }
      return [];
    }

    const packets: ServerBoundPacket[] = [];
    for (const input of body.data) {
      const parsed = safeParseServerBoundPacket(input);
      if (parsed.success) {
        packets.push(parsed.output);
      } else {
        this.logger.error('Invalid packet in query response');
        if (getPacketType(input) === RESPONSE_PACKET_TYPE) continue;
        const requestId = getRequestId(input);
        if (requestId) {
          await this.sendPayload(
            errorResponse(requestId, ResponseErrorReason.InvalidPayload, 'Invalid client packet'),
          );
        }
      }
    }
    return packets;
  }

  private startInterval(interval: number): void {
    if (this.queryInterval !== null) return;
    this.queryInterval = setInterval(() => {
      void this.poll();
    }, interval);
  }

  private async poll(): Promise<void> {
    if (this.isReconnecting) return;
    try {
      const packets = await this.queryData();
      this.failCount = 0;
      for (const packet of packets) {
        if (packet.type === RESPONSE_PACKET_TYPE) this.handleResponse(packet);
        else if ('requestId' in packet) await this.handleRequest(packet);
        else await this.handleNotification(packet);
      }
    } catch (error) {
      if (error instanceof AddonNotInstalledError) {
        this.logger.error(error.message);
        return;
      }
      this.logger.error('[query] fetch failed:', error);
      this.failCount++;
      if (this.failCount >= 3) {
        this.logger.error('Multiple timeouts detected, reconnecting...');
        this.scheduleReconnect();
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.isReconnecting) return;
    this.server.emit('clientDisconnect', this, DisconnectReason.ConnectionLost);
    void this.reconnect();
  }

  private stopInterval(): void {
    if (this.queryInterval === null) return;
    clearInterval(this.queryInterval);
    this.queryInterval = null;
  }
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
