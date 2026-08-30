import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import {
  type ConnectionResponse,
  DisconnectReason,
  WEBSOCKET_BRIDGE_PROTOCOL_VERSION,
  type ServerBoundApplicationRequestPacket,
  type ServerBoundNotificationPacket,
} from '@discord-mcbe/shared';
import {
  CommandStatusCode,
  ServerEvent,
  Server as SocketServer,
  type ServerOptions,
  type World as SocketWorld,
} from 'socket-be';
import { SocketSession } from './session';
import { AddonNotInstalledError } from '../errors';
import { Logger } from '../../../util';

import type { ServerBoundPacketHandler } from '../types';
import type { ISession } from '../interfaces';
import type { Application } from '../../../application';

interface ConnectionState {
  previousSessionId?: string;
  attemptCount: number;
}

class ProtocolVersionError extends Error {}

export class WebSocketBridgeServer extends EventEmitter<ServerEvents> {
  static readonly PROTOCOL_VERSION = WEBSOCKET_BRIDGE_PROTOCOL_VERSION;

  readonly server: SocketServer;
  readonly sessions = new Set<SocketSession>();
  private readonly logger: Logger;
  private readonly maxReconnectAttempts = 10;

  constructor(
    private readonly app: Application,
    serverOptions: ServerOptions,
    private readonly handleServerBoundPacket: ServerBoundPacketHandler,
  ) {
    super();

    this.server = new SocketServer(serverOptions);

    this.logger = new Logger('SocketBridgeServer', this.app.config);

    this.server.on(ServerEvent.Open, () => this.emit('open'));
    this.server.on(ServerEvent.WorldInitialize, this.onWorldInitialize.bind(this));
    this.server.on(ServerEvent.WorldRemove, this.onWorldRemove.bind(this));
    this.server.on(ServerEvent.PlayerJoin, this.onPlayerJoin.bind(this));
    this.server.on(ServerEvent.PlayerLeave, this.onPlayerLeave.bind(this));
  }

  async connect(world: SocketWorld, state: ConnectionState = { attemptCount: 0 }) {
    try {
      const session = await this.createSession(world, state.previousSessionId);

      this.emit('clientConnect', session);
    } catch (err) {
      if (err instanceof AddonNotInstalledError || err instanceof ProtocolVersionError) throw err;

      this.logger.warn(`Failed to create session:`, err);

      if (state.attemptCount >= this.maxReconnectAttempts) {
        this.logger.error('Max reconnect attempts reached, giving up');
        throw new Error('Failed to connect: Max reconnect attempts reached');
      }

      const backoffSeconds = Math.min(2 ** state.attemptCount, 60);

      state.attemptCount++;
      this.logger.warn(
        `Reconnect after ${backoffSeconds} seconds... (attempt ${state.attemptCount}/${this.maxReconnectAttempts})`,
      );

      await new Promise((resolve) => setTimeout(resolve, backoffSeconds * 1000));
      await this.connect(world, state);
    }
  }

  getSessionByWorld(world: SocketWorld): SocketSession | undefined {
    for (const session of this.sessions) {
      if (session.world === world) {
        return session;
      }
    }
  }

  handlePacket(
    session: SocketSession,
    packet: ServerBoundApplicationRequestPacket | ServerBoundNotificationPacket,
  ): unknown {
    return this.handleServerBoundPacket(session, packet);
  }

  private async createSession(world: SocketWorld, sessionId: string = randomUUID()): Promise<SocketSession> {
    const response = await world.runCommand(
      `dmc:__connect__ ${WebSocketBridgeServer.PROTOCOL_VERSION} ${sessionId}`,
    );
    if (response.statusCode === CommandStatusCode.FailedToParseCommand) {
      throw new AddonNotInstalledError();
    } else if (response.statusCode < CommandStatusCode.Success) {
      throw new Error(`Failed to create session: ${response.statusMessage}`);
    }

    let body: ConnectionResponse;
    try {
      body = JSON.parse(response.statusMessage);
    } catch {
      throw new Error(`Failed to parse connection response.\nbody: ${response.statusMessage}`);
    }

    if (body.error) throw new ProtocolVersionError(DisconnectReason[body.errorReason]);

    return new SocketSession(this.app, this, world, sessionId, body.clientId);
  }

  private async onWorldInitialize(ev: { world: SocketWorld }) {
    this.logger.debug('Established websocket connection. Connecting to bridge client...');

    const requestedAt = Date.now();
    try {
      await this.connect(ev.world);
      this.logger.info(`Connection established! (${Date.now() - requestedAt}ms)`);
    } catch (err) {
      this.logger.error(err);
      if (err instanceof AddonNotInstalledError) {
        await ev.world.sendMessage(
          '§c[discord-mcbe] Error: Required addon not installed. Please install the addon in your world and try again.',
        );
        await ev.world.disconnect();
      }
    }
  }

  private onWorldRemove(ev: { world: SocketWorld }) {
    const session = this.getSessionByWorld(ev.world);
    if (session) {
      session.destroy();
      this.sessions.delete(session);
      this.logger.info(`Disconnected session "${session.clientId}" as websocket closed.`);
    }
  }

  private async onPlayerJoin(ev: { world: SocketWorld }) {
    const session = this.getSessionByWorld(ev.world);
    if (ev.world.players.size === 1 && !session) {
      try {
        await this.connect(ev.world);
        this.logger.info('Reconnected!');
      } catch (err) {
        this.logger.error(err);
        await ev.world.disconnect();
      }
    }
  }

  private onPlayerLeave(ev: { world: SocketWorld }) {
    const session = this.getSessionByWorld(ev.world);
    if (session && ev.world.maxPlayers === 0) {
      session.destroy();
      this.logger.info(`Disconnected session "${session.clientId}" as player left the world.`);
    }
  }
}

interface ServerEvents {
  open: [];
  clientConnect: [session: ISession];
  clientDisconnect: [session: ISession, reason: DisconnectReason];
  sessionDestroy: [session: ISession];
}
