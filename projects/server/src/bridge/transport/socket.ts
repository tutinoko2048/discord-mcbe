import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { ConnectionResponse, SocketBridge } from '@discord-mcbe/shared';
import { BaseAction, DisconnectReason } from '@script-bridge/protocol';
import { SocketSession } from './session';
import { CommandStatusCode, ServerEvent, ServerOptions, Server as SocketServer, World as SocketWorld } from 'socket-be';
import { Logger } from '../../util';
import { ClientActionHandler } from './types';
import { NamespaceRequiredError } from '@script-bridge/server';

interface ConnectionState {
  previousSessionId?: string;
  attemptCount?: number;
}

export class SocketBridgeServer extends EventEmitter<ServerEvents> {
  static readonly PROTOCOL_VERSION = SocketBridge.PROTOCOL_VERSION;

  readonly server: SocketServer;
  readonly sessions = new Set<SocketSession>();
  private readonly actionHandlers = new Map<string, ClientActionHandler<BaseAction>>();

  private readonly logger = new Logger('SocketBridge');
  private readonly maxReconnectAttempts = 10;

  constructor(serverOptions: ServerOptions) {
    super();

    this.server = new SocketServer(serverOptions);

    this.server.on(ServerEvent.Open, () => {
      this.logger.info('[Local] SocketBridge server is listening on port', this.server.options.port);
    });

    this.server.on(ServerEvent.WorldInitialize, (ev) => {
      this.connect(ev.world).catch((e) => {
        this.logger.error('Failed to connect world:', e);
      });
    });

    this.server.on(ServerEvent.WorldRemove, (ev) => {
      const session = this.getSessionByWorld(ev.world);
      if (session) {
        session.destroy();
        this.sessions.delete(session);
      }
    });
  }

  connect(world: SocketWorld, state: ConnectionState = {}) {
    return new Promise<void>(async (resolve, reject) => {
      state.attemptCount ??= 0;

      try {
        const session = await this.createSession(world, state.previousSessionId);

        // this.isReconnecting = false;
        this.emit('clientConnect', session);
        resolve();
      } catch (e: any) {
        //FIXME - 普通の通信エラーのみを対象にしたい
        // this.isReconnecting = false;
        this.logger.error('Failed to create session:', e.message);

        if (state.attemptCount >= this.maxReconnectAttempts) {
          this.logger.error('Max reconnect attempts reached, giving up');
          reject(new Error('Max reconnect attempts reached'));
          return;
        }

        const backoffSeconds = Math.min(Math.pow(2, state.attemptCount), 60);

        state.attemptCount++;
        this.logger.error(`Reconnect after ${backoffSeconds} seconds... (attempt ${state.attemptCount}/${this.maxReconnectAttempts})`);

        setTimeout(() => {
          this.connect(world, state).then(resolve).catch(reject);
        }, backoffSeconds * 1000);
      }
    });
  }

  registerHandler<A extends BaseAction = BaseAction>(channelId: A['id'], handler: ClientActionHandler<A>) {
    if (!channelId.includes(':')) throw new NamespaceRequiredError(channelId);
    if (this.actionHandlers.has(channelId)) {
      this.logger.warn(`Overriding existing handler for channel '${channelId}'`);
    }
    this.actionHandlers.set(channelId, handler as unknown as ClientActionHandler<BaseAction>);
  }

  getSessionByWorld(world: SocketWorld): SocketSession | undefined {
    for (const session of this.sessions) {
      if (session.world === world) {
        return session;
      }
    }
  }

  getActionHandler(channelId: string): ClientActionHandler<BaseAction> | undefined {
    return this.actionHandlers.get(channelId);
  }

  private async createSession(
    world: SocketWorld,
    sessionId: string = randomUUID()
  ): Promise<SocketSession> {
    const response = await world.runCommand(`bridge:connect ${SocketBridgeServer.PROTOCOL_VERSION} ${sessionId}`);
    if (response.statusCode === CommandStatusCode.CommandNotFound) {
      throw new Error('/bridge:connect command not found. Please install the addon.');
    } else if (response.statusCode < CommandStatusCode.Success) {
      throw new Error(`Failed to create session: ${response.statusMessage}`);
    }

    let body: ConnectionResponse;
    try {
      body = JSON.parse(response.statusMessage);
    } catch (error: any) {
      throw new Error(`Failed to parse connection response.\nbody: ${response.statusMessage}`);
    }

    if (body.error) throw new Error(DisconnectReason[body.errorReason]);

    return new SocketSession(this, world, sessionId, body.clientId);
  }
}

interface ServerEvents {
  clientConnect: [session: SocketSession];
  clientDisconnect: [session: SocketSession, reason: DisconnectReason];
}
