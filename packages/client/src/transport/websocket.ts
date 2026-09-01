import {
  CommandPermissionLevel,
  CustomCommandParamType,
  CustomCommandStatus,
  system,
  world,
  type CustomCommandResult,
  type StartupEvent,
} from '@minecraft/server';
import {
  type ServerBoundNotificationPacket,
  type ServerBoundPacket,
  type ServerBoundRequestInput,
  type ServerBoundRequestPacket,
  type ConnectionResponse,
  DisconnectReason,
  errorResponse,
  InternalAction,
  PendingRequests,
  RESPONSE_PACKET_TYPE,
  type RequestResult,
  ResponseErrorReason,
  safeParseResponseData,
  safeParseClientBoundPacket,
  type ClientBoundRequestPacket,
  WEBSOCKET_BRIDGE_PROTOCOL_VERSION,
  successResponse,
} from '@discord-mcbe/shared';
import { Emitter } from '../utils/emitter';
import { Logger } from '../utils';
import type { ClientBoundRequestHandler, IBridgeClient } from './interfaces';

export interface WebSocketBridgeEvents {
  ready: {};
  connect: { sessionId: string };
  disconnect: { reason: DisconnectReason };
}

export interface WebSocketBridgeClientOptions {
  worldName: string | (() => string);
  handleRequest: ClientBoundRequestHandler;
}

type QueryResponse =
  | { error: true; errorReason: ResponseErrorReason }
  | { error?: false; data: ServerBoundPacket[] };

export class WebSocketBridgeClient extends Emitter<WebSocketBridgeEvents> implements IBridgeClient {
  static readonly PROTOCOL_VERSION = WEBSOCKET_BRIDGE_PROTOCOL_VERSION;

  private readonly sendQueue: ServerBoundPacket[] = [];
  private readonly pending = new PendingRequests<number>({
    set: (callback, ticks) => system.runTimeout(callback, ticks),
    clear: (timer) => system.clearRun(timer),
  });
  private readonly deltaTimes: number[] = [];
  private readonly logger = new Logger('discord-mcbe');

  private previousRequestId = 0;
  private currentSessionId: string | null = null;
  private lastQueryReceivedAt: number | null = null;
  private pendingDisconnectReason: DisconnectReason | null = null;

  constructor(private readonly options: WebSocketBridgeClientOptions) {
    super();
    system.beforeEvents.startup.subscribe(this.onStartup.bind(this));
    system.afterEvents.scriptEventReceive.subscribe(
      (event) => {
        if (event.id === 'bridge:message') this.onMessage(event.message.trim());
      },
      { namespaces: ['bridge'] },
    );
    world.afterEvents.worldLoad.subscribe(() => this.emit('ready', {}));
  }

  get isConnected(): boolean {
    return this.currentSessionId !== null;
  }

  get worldName(): string {
    return typeof this.options.worldName === 'function' ? this.options.worldName() : this.options.worldName;
  }

  request(packet: ServerBoundRequestInput): Promise<RequestResult<unknown>> {
    const sessionId = this.currentSessionId;
    if (!sessionId) throw new Error('No active session');
    const requestId = `${sessionId}:${++this.previousRequestId}`;
    const request = { ...packet, requestId } as ServerBoundRequestPacket;
    return this.pending.request(packet.type, requestId, 200, () => {
      this.sendQueue.push(request);
    });
  }

  notify(packet: ServerBoundNotificationPacket): void {
    if (!this.currentSessionId) return;
    this.sendQueue.push(packet);
  }

  async disconnect(reason: DisconnectReason = DisconnectReason.Disconnect): Promise<void> {
    try {
      await this.request({ type: InternalAction.Disconnect, data: { reason } });
    } catch (error) {
      this.logger.warn('Failed to send disconnect message', error);
    }
    this.destroy();
    this.emit('disconnect', { reason });
  }

  destroy(): void {
    this.pending.abortAll('Session disconnected before response was received');
    this.sendQueue.length = 0;
    this.deltaTimes.length = 0;
    this.lastQueryReceivedAt = null;
    this.currentSessionId = null;
    this.pendingDisconnectReason = null;
    this.previousRequestId = 0;
  }

  private handleConnection(protocolVersion: number, sessionId: string): CustomCommandResult {
    let body: ConnectionResponse;
    if (WebSocketBridgeClient.PROTOCOL_VERSION > protocolVersion) {
      body = { error: true, errorReason: DisconnectReason.OutdatedServer };
    } else if (WebSocketBridgeClient.PROTOCOL_VERSION < protocolVersion) {
      body = { error: true, errorReason: DisconnectReason.OutdatedClient };
    } else {
      body = {
        protocolVersion: WebSocketBridgeClient.PROTOCOL_VERSION,
        worldName: this.worldName,
      };
      this.destroy();
      this.currentSessionId = sessionId;
      this.emit('connect', { sessionId });
    }
    return { status: CustomCommandStatus.Success, message: JSON.stringify(body) };
  }

  private async handleRequest(request: ClientBoundRequestPacket): Promise<void> {
    let data: unknown;
    try {
      if (request.type === InternalAction.Ping) {
        data = { receivedAt: Date.now() };
      } else if (request.type === InternalAction.Disconnect) {
        this.pendingDisconnectReason = request.data.reason;
        data = null;
      } else {
        data = (await this.options.handleRequest(request)).data;
      }

      const parsed = safeParseResponseData(request.type, data);
      this.sendQueue.push(
        parsed.success
          ? successResponse(request.requestId, parsed.output)
          : errorResponse(
              request.requestId,
              ResponseErrorReason.InvalidPayload,
              `Invalid response data for ${request.type}`,
            ),
      );
    } catch (error) {
      this.sendQueue.push(
        errorResponse(
          request.requestId,
          ResponseErrorReason.InternalError,
          `An error occurred while handling ${request.type}\n${String(error)}`,
        ),
      );
    }
  }

  private getQueue(): ServerBoundPacket[] {
    const queue = this.sendQueue.slice();
    this.sendQueue.length = 0;
    if (this.pendingDisconnectReason !== null) {
      const reason = this.pendingDisconnectReason;
      system.run(() => {
        this.destroy();
        this.emit('disconnect', { reason });
      });
    }
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
    return { status: CustomCommandStatus.Success, message: JSON.stringify(result) };
  }

  private onMessage(rawMessage: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawMessage);
    } catch (error) {
      console.error('[SocketBridge] Failed to parse message:', error);
      return;
    }

    const result = safeParseClientBoundPacket(parsed);
    if (!result.success) {
      console.error('[SocketBridge] Invalid packet:', result.issues);
      if (typeof parsed === 'object' && parsed !== null) {
        const record = parsed as Record<string, unknown>;
        if (record.type === RESPONSE_PACKET_TYPE) return;
        const requestId = record.requestId;
        if (typeof requestId === 'string') {
          this.sendQueue.push(
            errorResponse(requestId, ResponseErrorReason.InvalidPayload, 'Invalid request packet'),
          );
        }
      }
      return;
    }

    if (result.output.type === RESPONSE_PACKET_TYPE) {
      this.pending.handle(result.output);
    } else {
      void this.handleRequest(result.output);
    }
  }

  private onStartup(event: StartupEvent): void {
    const registry = event.customCommandRegistry;
    registry.registerCommand(
      {
        name: 'dmc:__query__',
        description: '§8[internal] query messages for SocketBridge',
        permissionLevel: CommandPermissionLevel.Host,
        mandatoryParameters: [{ name: 'sessionId', type: CustomCommandParamType.String }],
      },
      (_, sessionId: string) => this.onQuery(sessionId),
    );
    registry.registerCommand(
      {
        name: 'dmc:__connect__',
        description: '§8[internal] initialize connection for SocketBridge',
        permissionLevel: CommandPermissionLevel.Host,
        mandatoryParameters: [
          { name: 'protocolVersion', type: CustomCommandParamType.Integer },
          { name: 'sessionId', type: CustomCommandParamType.String },
        ],
      },
      (_, protocolVersion: number, sessionId: string) => this.handleConnection(protocolVersion, sessionId),
    );
  }
}
