import { once } from 'node:events';
import { createServer } from 'node:net';
import { describe, expect, test } from 'bun:test';
import { WebSocket, type RawData } from 'ws';
import {
  ActionId,
  DisconnectReason,
  InternalAction,
  RESPONSE_PACKET_TYPE,
  ResponseErrorReason,
  SERVER_NET_BRIDGE_PROTOCOL_VERSION,
  type ClientBoundPacket,
} from '@discord-mcbe/shared';
import { ServerNetBridgeServer } from './server';

describe('ServerNetBridgeServer protocol v2', () => {
  test('does not expose HTTP session or query endpoints', async () => {
    const port = await getAvailablePort();
    const server = createBridge(port);
    await server.start();
    try {
      for (const path of ['/new', '/query']) {
        const response = await fetch(`http://127.0.0.1:${port}${path}`);
        expect(response.status).toBe(426);
        await response.text();
      }
      expect(server.sessions.size).toBe(0);
    } finally {
      await server.stop();
    }
  });

  test('uses the v2 handshake and cleans up a closed connection', async () => {
    const port = await getAvailablePort();
    const server = createBridge(port);
    await server.start();
    const socket = new WebSocket(`ws://127.0.0.1:${port}`);
    try {
      await once(socket, 'open');
      const handshake = nextPacket(socket);
      socket.send(
        JSON.stringify({
          type: InternalAction.Connect,
          requestId: 'connect-wire',
          data: { clientId: 'wire-client', protocolVersion: 2 },
        }),
      );
      expect(await handshake).toMatchObject({
        type: RESPONSE_PACKET_TYPE,
        ok: true,
        requestId: 'connect-wire',
        data: { sessionId: expect.any(String) },
      });

      const session = [...server.sessions][0];
      const disconnected = once(server, 'clientDisconnect');
      const closed = once(socket, 'close');
      socket.close();
      const [disconnectedSession, reason] = await disconnected;
      expect(disconnectedSession).toBe(session);
      expect(reason).toBe(DisconnectReason.ConnectionLost);
      await closed;
      expect(server.sessions.size).toBe(0);
    } finally {
      if (socket.readyState !== WebSocket.CLOSED) socket.close();
      await server.stop();
    }
  });

  test('rejects protocol v1 without retrying it as a normal packet', async () => {
    const port = await getAvailablePort();
    const server = createBridge(port);
    await server.start();
    const socket = new WebSocket(`ws://127.0.0.1:${port}`);
    try {
      await once(socket, 'open');
      const response = nextPacket(socket);
      socket.send(
        JSON.stringify({
          type: InternalAction.Connect,
          requestId: 'connect-v1',
          data: { clientId: 'old-client', protocolVersion: 1 },
        }),
      );
      expect(await response).toEqual({
        type: RESPONSE_PACKET_TYPE,
        requestId: 'connect-v1',
        ok: false,
        error: {
          code: ResponseErrorReason.InvalidPayload,
          message: DisconnectReason[DisconnectReason.OutdatedClient],
        },
      });
      expect([...server.sessions][0]).toMatchObject({ isConnected: false });
    } finally {
      socket.close();
      await once(socket, 'close');
      await server.stop();
    }
  });

  test('dispatches fixed requests and sends typed responses', async () => {
    const port = await getAvailablePort();
    const received: unknown[] = [];
    const server = new ServerNetBridgeServer({
      port,
      handlePacket: (_session, packet) => {
        received.push(packet);
        return null;
      },
    });
    await server.start();
    const socket = new WebSocket(`ws://127.0.0.1:${port}`);
    try {
      await once(socket, 'open');
      await connect(socket);

      const response = nextPacket(socket);
      socket.send(
        JSON.stringify({
          type: ActionId.WorldInitialize,
          requestId: 'initialize-1',
          data: { players: [] },
        }),
      );
      expect(await response).toEqual({
        type: RESPONSE_PACKET_TYPE,
        requestId: 'initialize-1',
        ok: true,
        data: null,
      });
      expect(received).toHaveLength(1);
    } finally {
      socket.close();
      await once(socket, 'close');
      await server.stop();
    }
  });

  test('does not respond to notifications', async () => {
    const port = await getAvailablePort();
    let notificationType: string | undefined;
    const server = new ServerNetBridgeServer({
      port,
      handlePacket: (_session, packet) => {
        notificationType = packet.type;
      },
    });
    await server.start();
    const socket = new WebSocket(`ws://127.0.0.1:${port}`);
    try {
      await once(socket, 'open');
      await connect(socket);
      socket.send(
        JSON.stringify({
          type: ActionId.PlayerLeave,
          data: { playerUniqueId: 'player-1' },
        }),
      );
      await Bun.sleep(20);
      expect(notificationType).toBe(ActionId.PlayerLeave);
      expect(await hasMessage(socket, 30)).toBe(false);
    } finally {
      socket.close();
      await once(socket, 'close');
      await server.stop();
    }
  });

  test('correlates outbound requests with common responses', async () => {
    const port = await getAvailablePort();
    const server = createBridge(port);
    await server.start();
    const socket = new WebSocket(`ws://127.0.0.1:${port}`);
    try {
      await once(socket, 'open');
      await connect(socket);
      const session = [...server.sessions][0];
      if (!session) throw new Error('Session was not created');

      const outbound = nextPacket(socket);
      const result = session.send(ActionId.GetTPS, null);
      const request = await outbound;
      expect(request).toMatchObject({ type: ActionId.GetTPS, data: null });
      socket.send(
        JSON.stringify({
          type: RESPONSE_PACKET_TYPE,
          requestId: request.requestId,
          ok: true,
          data: { tps: 20 },
        }),
      );
      expect(await result).toEqual({ error: false, data: { tps: 20 } });
    } finally {
      socket.close();
      await once(socket, 'close');
      await server.stop();
    }
  });

  test('distinguishes malformed JSON from an invalid packet', async () => {
    const port = await getAvailablePort();
    const server = createBridge(port);
    await server.start();
    const socket = new WebSocket(`ws://127.0.0.1:${port}`);
    try {
      await once(socket, 'open');
      const malformed = nextPacket(socket);
      socket.send('{');
      expect(await malformed).toMatchObject({
        type: RESPONSE_PACKET_TYPE,
        ok: false,
        error: { code: ResponseErrorReason.InvalidPayload, message: 'Invalid JSON payload' },
      });

      const invalid = nextPacket(socket);
      socket.send(JSON.stringify({ type: ActionId.WorldInitialize, requestId: 'invalid-1' }));
      expect(await invalid).toMatchObject({
        type: RESPONSE_PACKET_TYPE,
        requestId: 'invalid-1',
        ok: false,
        error: { code: ResponseErrorReason.InvalidPayload },
      });
    } finally {
      socket.close();
      await once(socket, 'close');
      await server.stop();
    }
  });

  test('does not answer an invalid response packet', async () => {
    const port = await getAvailablePort();
    const server = createBridge(port);
    await server.start();
    const socket = new WebSocket(`ws://127.0.0.1:${port}`);
    try {
      await once(socket, 'open');
      await connect(socket);
      socket.send(JSON.stringify({ type: RESPONSE_PACKET_TYPE, requestId: 'orphan', ok: true }));
      expect(await hasMessage(socket, 30)).toBe(false);
    } finally {
      socket.close();
      await once(socket, 'close');
      await server.stop();
    }
  });

  test('rejects an invalid disconnect without destroying the session', async () => {
    const port = await getAvailablePort();
    const server = createBridge(port);
    await server.start();
    const socket = new WebSocket(`ws://127.0.0.1:${port}`);
    try {
      await once(socket, 'open');
      await connect(socket);
      const response = nextPacket(socket);
      socket.send(JSON.stringify({ type: InternalAction.Disconnect, requestId: 'disconnect-1', data: {} }));
      expect(await response).toMatchObject({
        type: RESPONSE_PACKET_TYPE,
        requestId: 'disconnect-1',
        ok: false,
        error: { code: ResponseErrorReason.InvalidPayload },
      });
      expect([...server.sessions][0]).toMatchObject({ isConnected: true, isDestroyed: false });
    } finally {
      socket.close();
      await once(socket, 'close');
      await server.stop();
    }
  });
});

function createBridge(port: number): ServerNetBridgeServer {
  return new ServerNetBridgeServer({ port, handlePacket: () => null });
}

async function connect(socket: WebSocket): Promise<void> {
  const handshake = nextPacket(socket);
  socket.send(
    JSON.stringify({
      type: InternalAction.Connect,
      requestId: 'connect-1',
      data: { clientId: 'test-client', protocolVersion: SERVER_NET_BRIDGE_PROTOCOL_VERSION },
    }),
  );
  expect(await handshake).toMatchObject({
    type: RESPONSE_PACKET_TYPE,
    requestId: 'connect-1',
    ok: true,
  });
}

function nextPacket(socket: WebSocket): Promise<ClientBoundPacket> {
  return new Promise((resolve) => {
    socket.once('message', (data) => resolve(JSON.parse(rawDataToString(data)) as ClientBoundPacket));
  });
}

function hasMessage(socket: WebSocket, timeout: number): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      socket.off('message', onMessage);
      resolve(false);
    }, timeout);
    const onMessage = () => {
      clearTimeout(timer);
      resolve(true);
    };
    socket.once('message', onMessage);
  });
}

function rawDataToString(data: RawData): string {
  if (Array.isArray(data)) return Buffer.concat(data).toString();
  if (data instanceof ArrayBuffer) return Buffer.from(new Uint8Array(data)).toString();
  return data.toString();
}

async function getAvailablePort(): Promise<number> {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Failed to allocate test port');
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  return address.port;
}
