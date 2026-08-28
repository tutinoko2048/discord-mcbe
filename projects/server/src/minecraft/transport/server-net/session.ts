import {
  BaseAction,
  ServerNetPayload,
  ServerNetRequest,
  ServerNetResponse,
  DisconnectReason,
  InternalAction,
  InternalActions,
  NamespaceRequiredError,
  PayloadType,
  ResponseErrorReason,
} from '@discord-mcbe/shared';
import { randomUUID } from 'crypto';
import { WebSocket } from 'ws';
import { ISession } from '../interfaces';
import { ServerNetBridgeServer } from './server';

export type ServerNetSessionResponse<T = unknown> = ServerNetResponse<T> & { sessionId: string };

export class ServerNetSession implements ISession {
  readonly id = randomUUID();
  readonly _awaitingResponses = new Map<
    string,
    { resolve: (response: ServerNetSessionResponse) => void; sentAt: number; timeout: NodeJS.Timeout }
  >();

  clientId = '';
  isConnected = false;
  isDestroyed = false;
  disconnectReason: DisconnectReason | null = null;

  private readonly deltaTimes: number[] = [];
  private readonly handshakeTimeout: NodeJS.Timeout;

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
  ): Promise<ServerNetSessionResponse<A['response']>> {
    if (!channelId.includes(':')) throw new NamespaceRequiredError(channelId);
    if (!this.isConnected || this.isDestroyed) throw new Error('No active WebSocket session');

    const requestId = randomUUID();
    const payload: ServerNetRequest<A['request']> = {
      type: PayloadType.Request,
      channelId,
      requestId,
      data,
    };
    return new Promise((resolve, reject) => {
      const pending = {
        resolve: resolve as (response: ServerNetSessionResponse) => void,
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

  handleResponse(response: ServerNetResponse): void {
    const pending = this._awaitingResponses.get(response.requestId);
    if (!pending) return;

    clearTimeout(pending.timeout);
    this._awaitingResponses.delete(response.requestId);
    this.deltaTimes.push(Date.now() - pending.sentAt);
    if (this.deltaTimes.length > 10) this.deltaTimes.shift();
    pending.resolve({ ...response, sessionId: this.id });
  }

  sendPayload(payload: ServerNetPayload): void {
    if (this.socket.readyState !== WebSocket.OPEN) throw new Error('WebSocket is not open');
    this.socket.send(JSON.stringify(payload));
  }
}
