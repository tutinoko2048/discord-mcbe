import { CommandStatusCode, type World as SocketWorld } from 'socket-be';
import type {
  ClientRequest,
  ClientResponse,
  QueryResponse,
  ServerRequest,
  ServerResponse,
} from '@discord-mcbe/shared';
import {
  DisconnectReason,
  InternalAction,
  PayloadType,
  ResponseErrorReason,
  type BaseAction,
  type InternalActions,
} from '@script-bridge/protocol';
import { NamespaceRequiredError } from '@script-bridge/server';
import { AddonNotInstalledError } from './errors';
import { Logger } from '../../../util';

import type { ISession } from './interfaces';
import type { SocketBridgeServer } from './socket';

export class SocketSession implements ISession {
  private readonly server: SocketBridgeServer;
  readonly world: SocketWorld;

  /** session id */
  readonly id: string;

  readonly clientId: string;

  readonly _awaitingResponses = new Map<number, (response: ClientResponse) => void>();

  private readonly logger: Logger;
  private readonly deltaTimes: number[] = [];
  private readonly requestInterval: number = 500;
  private previousRequestId = 0;
  private queryInterval: NodeJS.Timeout | null = null;
  private isReconnecting = false;
  /** Number of failed query requests */
  private failCount = 0;

  constructor(server: SocketBridgeServer, world: SocketWorld, id: string, clientId: string) {
    this.server = server;
    this.world = world;
    this.id = id;
    this.clientId = clientId;
    this.logger = new Logger('SocketSession', this.server.server.options);
    this.server.sessions.add(this);

    this.startInterval(this.requestInterval);
  }

  destroy(): void {
    this.clearResponses();
    this.server.sessions.delete(this);
    this.stopInterval();
    this._awaitingResponses.clear();
    this.deltaTimes.length = 0;
    this.previousRequestId = 0;
    this.isReconnecting = false;
    this.failCount = 0;
    this.logger.debug('Session destroyed');
    this.server.emit('sessionDestroy', this);
  }

  async disconnect(reason: DisconnectReason = DisconnectReason.Disconnect): Promise<void> {
    await this.send<InternalActions.Disconnect>(InternalAction.Disconnect, { reason }, 5_000);
    this.server.emit('clientDisconnect', this, reason);
    this.destroy();
  }

  async reconnect() {
    this.destroy();

    if (this.isReconnecting) {
      this.logger.warn('Already reconnecting, skipping...');
      return;
    }

    this.isReconnecting = true;

    await this.server.connect(this.world);

    this.isReconnecting = false;
  }

  async send<A extends BaseAction = BaseAction>(
    channelId: A['id'],
    data?: A['request'],
    timeout: number = 10_000,
  ): Promise<ClientResponse<A['response']>> {
    if (!channelId.includes(':')) throw new NamespaceRequiredError(channelId);

    const requestId = ++this.previousRequestId;
    const payload: ServerRequest = {
      type: PayloadType.Request,
      channelId,
      sessionId: this.id,
      requestId,
      data,
    };

    await this.sendPayload(payload);

    const sentAt = Date.now();

    return new Promise((resolve) => {
      const to = setTimeout(() => {
        this._awaitingResponses.delete(requestId);
        resolve({
          type: PayloadType.Response,
          error: true,
          errorReason: ResponseErrorReason.Timeout,
          message: 'Request timed out',
          sessionId: this.id,
          requestId,
        });
      }, timeout);

      this._awaitingResponses.set(requestId, (response: ClientResponse<A['response']>) => {
        this._awaitingResponses.delete(requestId);
        clearTimeout(to);
        resolve(response);

        if (this.deltaTimes.length >= 10) this.deltaTimes.shift();
        this.deltaTimes.push(Date.now() - sentAt);
      });
    });
  }

  get averagePing(): number {
    if (this.deltaTimes.length === 0) return -1;
    return this.deltaTimes.reduce((a, b) => a + b, 0) / this.deltaTimes.length;
  }

  private async sendPayload(payload: ServerRequest | ServerResponse) {
    const res = await this.world.runCommand(`scriptevent bridge:message ${JSON.stringify(payload)}`);
    if (res.statusCode < CommandStatusCode.Success) throw new Error(res.statusMessage);
  }

  private async handleRequest(request: ClientRequest): Promise<ServerResponse> {
    const { requestId, sessionId, channelId, data } = request;
    const handler = this.server.getActionHandler(channelId);
    if (!handler) {
      this.logger.error(`Unhandled request for channel: ${channelId}`);
      return {
        type: PayloadType.Response,
        error: true,
        message: `No handler found for channel: ${channelId}`,
        errorReason: ResponseErrorReason.UnhandledRequest,
        sessionId,
        requestId,
      };
    }

    try {
      const response: ServerResponse = {
        type: PayloadType.Response,
        error: false,
        sessionId,
        requestId,
        data: undefined,
      };

      await handler({
        data,
        session: this,
        respond: (data) => {
          response.data = data;
        },
      });

      return response;
    } catch (err) {
      this.logger.error('Error while handling request:', channelId, err);
      return {
        type: PayloadType.Response,
        error: true,
        message: `An error occurred while handling the request\n${err}`,
        errorReason: ResponseErrorReason.InternalError,
        sessionId,
        requestId,
      };
    }
  }

  private handleResponse(response: ClientResponse) {
    const { requestId } = response;
    const resolve = this._awaitingResponses.get(requestId);
    if (resolve) {
      resolve(response);
      this._awaitingResponses.delete(requestId);
    }
  }

  private async queryData() {
    if (!this.world.isValid) return [];

    const res = await this.world.runCommand(`dmc:__query__ ${this.id}`);
    if (res.statusCode === CommandStatusCode.FailedToParseCommand) {
      // コマンドが見つからない=ワールドから退出しているはずなのでいったん無視する
      return [];
    }
    if (res.statusCode < CommandStatusCode.Success) throw new Error(res.statusMessage);

    let body: QueryResponse;
    try {
      body = JSON.parse(res.statusMessage);
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
    } else {
      return body.data;
    }
  }

  private startInterval(interval: number): void {
    if (this.queryInterval !== null) return;

    this.queryInterval = setInterval(async () => {
      if (this.isReconnecting) return;

      const sentAt = Date.now();
      let requests: (ClientRequest | ClientResponse)[];
      try {
        requests = await this.queryData();
        this.failCount = 0;
      } catch (e) {
        if (e instanceof AddonNotInstalledError) {
          this.logger.error(e.message);
          return;
        }

        this.logger.error(`[query] fetch failed: ${e}`);

        this.failCount++;
        if (this.failCount >= 3) {
          this.logger.error('Multiple timeouts detected, reconnecting...');
          this.scheduleReconnect();
        }
        return;
      }

      for (const request of requests) {
        if (request.type === PayloadType.Response) {
          this.handleResponse(request);
        } else if (request.type === PayloadType.Request) {
          const response = await this.handleRequest(request);
          try {
            await this.sendPayload(response);
          } catch (e) {
            this.logger.error(`Failed to send response: ${e}`);
          }
        }
      }

      this.deltaTimes.push(Date.now() - sentAt);
      if (this.deltaTimes.length > 10) this.deltaTimes.shift();
    }, interval);
  }

  private scheduleReconnect(): void {
    if (this.isReconnecting) return;

    this.server.emit('clientDisconnect', this, DisconnectReason.ConnectionLost);

    this.reconnect();
  }

  private stopInterval(): void {
    if (this.queryInterval !== null) {
      clearInterval(this.queryInterval);
      this.queryInterval = null;
    }
  }

  private clearResponses(): void {
    for (const [requestId, respond] of this._awaitingResponses) {
      respond({
        type: PayloadType.Response,
        error: true,
        message: 'Session disconnected',
        errorReason: ResponseErrorReason.Abort,
        sessionId: this.id,
        requestId,
      });
    }
    this._awaitingResponses.clear();
  }
}
