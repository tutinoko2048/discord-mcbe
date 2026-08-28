import { once } from 'node:events';
import { createServer } from 'node:net';
import { describe, expect, test } from 'bun:test';
import { WebSocket, type RawData } from 'ws';
import {
  ServerNetBridge,
  DisconnectReason,
  NamespaceRequiredError,
  type ServerNetPayload,
  InternalAction,
  PayloadType,
  ResponseErrorReason,
  type BaseAction,
} from '@discord-mcbe/shared';
import { ServerNetBridgeServer } from './server';

type EchoAction = BaseAction<'test:echo', { value: string }, { value: string }>;

describe('ServerNetBridgeServer', () => {
  test('rejects action handlers without a namespace', () => {
    const server = new ServerNetBridgeServer({ port: 0 });
    expect(() => server.registerHandler('echo', () => {})).toThrow(NamespaceRequiredError);
  });

  test('does not expose HTTP session or query endpoints', async () => {
    const port = await getAvailablePort();
    const server = new ServerNetBridgeServer({ port });
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

  test('preserves the wire handshake and cleans up a closed connection', async () => {
    const port = await getAvailablePort();
    const server = new ServerNetBridgeServer({ port });
    await server.start();
    const socket = new WebSocket(`ws://127.0.0.1:${port}`);

    try {
      await once(socket, 'open');
      const handshake = nextPayload(socket);
      // Literal values ensure client/server constants cannot silently drift together.
      socket.send(
        JSON.stringify({
          type: 0,
          channelId: '__internal__:connect',
          requestId: 'connect-wire',
          data: { clientId: 'wire-client', protocolVersion: 1 },
        }),
      );
      expect(await handshake).toMatchObject({
        type: 1,
        error: false,
        requestId: 'connect-wire',
        data: { sessionId: expect.any(String) },
      });

      const session = [...server.sessions][0];
      const disconnect = once(server, 'clientDisconnect');
      const closed = once(socket, 'close');
      socket.close();
      const [disconnectedSession, reason] = await disconnect;
      expect(disconnectedSession).toBe(session);
      expect(reason).toBe(DisconnectReason.ConnectionLost);
      await closed;
      expect(server.sessions.size).toBe(0);
    } finally {
      if (socket.readyState !== WebSocket.CLOSED) {
        const closed = once(socket, 'close');
        socket.close();
        await closed;
      }
      await server.stop();
    }
  });

  test('adapts bidirectional actions to WebSocket messages', async () => {
    const port = await getAvailablePort();
    const server = new ServerNetBridgeServer({ port });
    server.registerHandler<EchoAction>('test:echo', (action) => {
      action.respond({ value: action.data.value });
    });

    await server.start();
    const socket = new WebSocket(`ws://127.0.0.1:${port}`);

    try {
      await once(socket, 'open');

      const handshake = nextPayload(socket);
      socket.send(
        JSON.stringify({
          type: PayloadType.Request,
          channelId: InternalAction.Connect,
          requestId: 'connect-1',
          data: {
            clientId: 'test-client',
            protocolVersion: ServerNetBridge.PROTOCOL_VERSION,
          },
        }),
      );
      expect(await handshake).toMatchObject({
        type: PayloadType.Response,
        error: false,
        requestId: 'connect-1',
      });

      const echo = nextPayload(socket);
      socket.send(
        JSON.stringify({
          type: PayloadType.Request,
          channelId: 'test:echo',
          requestId: 'echo-1',
          data: { value: 'from-client' },
        }),
      );
      expect(await echo).toEqual({
        type: PayloadType.Response,
        error: false,
        requestId: 'echo-1',
        data: { value: 'from-client' },
      });

      const session = [...server.sessions][0];
      if (!session) throw new Error('WebSocket session was not created');
      const outboundPayload = nextPayload(socket);
      const outboundResponse = session.send<EchoAction>('test:echo', { value: 'from-server' });
      const outboundRequest = await outboundPayload;
      expect(outboundRequest).toMatchObject({
        type: PayloadType.Request,
        channelId: 'test:echo',
        data: { value: 'from-server' },
      });

      socket.send(
        JSON.stringify({
          type: PayloadType.Response,
          error: false,
          requestId: outboundRequest.requestId,
          data: { value: 'from-server' },
        }),
      );
      expect(await outboundResponse).toMatchObject({
        error: false,
        data: { value: 'from-server' },
        sessionId: session.id,
      });
    } finally {
      socket.close();
      await once(socket, 'close');
      await server.stop();
    }
  });

  test('distinguishes malformed JSON from an invalid WebSocket payload', async () => {
    const port = await getAvailablePort();
    const server = new ServerNetBridgeServer({ port });
    await server.start();
    const socket = new WebSocket(`ws://127.0.0.1:${port}`);

    try {
      await once(socket, 'open');

      const malformedJson = nextPayload(socket);
      socket.send('{');
      expect(await malformedJson).toMatchObject({
        error: true,
        errorReason: ResponseErrorReason.InvalidPayload,
        message: 'Invalid JSON payload',
      });

      const invalidPayload = nextPayload(socket);
      socket.send(JSON.stringify({ type: PayloadType.Request, requestId: 'invalid-1' }));
      expect(await invalidPayload).toMatchObject({
        error: true,
        errorReason: ResponseErrorReason.InvalidPayload,
        message: 'Invalid WebSocket payload',
      });
    } finally {
      socket.close();
      await once(socket, 'close');
      await server.stop();
    }
  });

  test('rejects an invalid disconnect reason without destroying the session', async () => {
    const port = await getAvailablePort();
    const server = new ServerNetBridgeServer({ port });
    await server.start();
    const socket = new WebSocket(`ws://127.0.0.1:${port}`);

    try {
      await once(socket, 'open');
      await connect(socket);

      const response = nextPayload(socket);
      socket.send(
        JSON.stringify({
          type: PayloadType.Request,
          channelId: InternalAction.Disconnect,
          requestId: 'disconnect-1',
          data: {},
        }),
      );

      expect(await response).toEqual({
        type: PayloadType.Response,
        error: true,
        errorReason: ResponseErrorReason.InvalidPayload,
        message: 'Invalid disconnect payload',
        requestId: 'disconnect-1',
      });
      expect([...server.sessions][0]).toMatchObject({ isConnected: true, isDestroyed: false });
      expect(socket.readyState).toBe(WebSocket.OPEN);
    } finally {
      socket.close();
      await once(socket, 'close');
      await server.stop();
    }
  });
});

async function connect(socket: WebSocket): Promise<void> {
  const handshake = nextPayload(socket);
  socket.send(
    JSON.stringify({
      type: PayloadType.Request,
      channelId: InternalAction.Connect,
      requestId: 'connect-1',
      data: {
        clientId: 'test-client',
        protocolVersion: ServerNetBridge.PROTOCOL_VERSION,
      },
    }),
  );
  expect(await handshake).toMatchObject({
    type: PayloadType.Response,
    error: false,
    requestId: 'connect-1',
  });
}

function nextPayload(socket: WebSocket): Promise<ServerNetPayload> {
  return new Promise((resolve) => {
    socket.once('message', (data) => resolve(JSON.parse(rawDataToString(data)) as ServerNetPayload));
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
