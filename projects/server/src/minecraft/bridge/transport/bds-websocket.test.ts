import { once } from 'node:events';
import { createServer } from 'node:net';
import { describe, expect, test } from 'bun:test';
import { WebSocket, type RawData } from 'ws';
import { BdsWebSocketBridge, type BdsWebSocketPayload } from '@discord-mcbe/shared';
import { InternalAction, PayloadType, ResponseErrorReason, type BaseAction } from '@script-bridge/protocol';
import { BdsWebSocketBridgeServer } from './bds-websocket';

type EchoAction = BaseAction<'test:echo', { value: string }, { value: string }>;

describe('BdsWebSocketBridgeServer', () => {
  test('adapts bidirectional actions to WebSocket messages', async () => {
    const port = await getAvailablePort();
    const server = new BdsWebSocketBridgeServer({ port });
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
            protocolVersion: BdsWebSocketBridge.PROTOCOL_VERSION,
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
    const server = new BdsWebSocketBridgeServer({ port });
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
    const server = new BdsWebSocketBridgeServer({ port });
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
        protocolVersion: BdsWebSocketBridge.PROTOCOL_VERSION,
      },
    }),
  );
  expect(await handshake).toMatchObject({
    type: PayloadType.Response,
    error: false,
    requestId: 'connect-1',
  });
}

function nextPayload(socket: WebSocket): Promise<BdsWebSocketPayload> {
  return new Promise((resolve) => {
    socket.once('message', (data) => resolve(JSON.parse(rawDataToString(data)) as BdsWebSocketPayload));
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
