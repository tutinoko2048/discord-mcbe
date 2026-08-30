import { randomUUID } from 'node:crypto';
import { WebSocket } from 'ws';
import {
  DisconnectReason,
  InternalAction,
  PendingRequests,
  type RequestResult,
  type ResponsePacket,
  type ClientBoundPacket,
  type ClientBoundRequestData,
  type ClientBoundRequestPacket,
  type ClientBoundRequestType,
  type ClientBoundResponseData,
} from '@discord-mcbe/shared';
import type { ISession } from '../interfaces';
import type { ServerNetBridgeServer } from './server';

export class ServerNetSession implements ISession {
  readonly id = randomUUID();

  clientId = '';
  isConnected = false;
  isDestroyed = false;
  disconnectReason: DisconnectReason | null = null;

  private readonly pending = new PendingRequests<NodeJS.Timeout>({
    set: (callback, delay) => setTimeout(callback, delay),
    clear: (timer) => clearTimeout(timer),
  });
  private readonly sentAt = new Map<string, number>();
  private readonly deltaTimes: number[] = [];
  private readonly handshakeTimeout: NodeJS.Timeout;
  private previousRequestId = 0;
  private incoming = Promise.resolve();

  constructor(
    private readonly server: ServerNetBridgeServer,
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
        await this.send(InternalAction.Disconnect, { reason }, 5_000);
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
    this.pending.abortAll('Session disconnected');
    this.sentAt.clear();
    this.server.sessions.delete(this);
    if (this.socket.readyState === WebSocket.OPEN) this.socket.close();
    if (this.isConnected) this.server.emit('sessionDestroy', this);
    this.isConnected = false;
  }

  send<T extends ClientBoundRequestType>(
    type: T,
    data: ClientBoundRequestData<T>,
    timeout: number = 10_000,
  ): Promise<RequestResult<ClientBoundResponseData<T>>> {
    if (!this.isConnected || this.isDestroyed) throw new Error('No active WebSocket session');
    const requestId = `${this.id}:${++this.previousRequestId}`;
    const packet = { type, requestId, data } as ClientBoundRequestPacket;
    this.sentAt.set(requestId, Date.now());
    return this.pending
      .request(type, requestId, timeout, () => this.sendPayload(packet))
      .finally(() => this.sentAt.delete(requestId));
  }

  handleResponse(response: ResponsePacket): void {
    const sentAt = this.sentAt.get(response.requestId);
    this.sentAt.delete(response.requestId);
    if (!this.pending.handle(response) || sentAt === undefined) return;
    this.deltaTimes.push(Date.now() - sentAt);
    if (this.deltaTimes.length > 10) this.deltaTimes.shift();
  }

  enqueueIncomingTask(task: () => PromiseLike<void> | void): Promise<void> {
    const next = this.incoming.then(task);
    this.incoming = next.catch(() => {});
    return next;
  }

  sendPayload(payload: ClientBoundPacket): void {
    if (this.socket.readyState !== WebSocket.OPEN) throw new Error('WebSocket is not open');
    this.socket.send(JSON.stringify(payload));
  }
}
