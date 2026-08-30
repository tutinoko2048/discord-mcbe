/// <reference types="bun-types" />

import { describe, expect, test } from 'bun:test';
import {
  ActionId,
  GetTpsPacket,
  InternalAction,
  PendingRequests,
  RequestPackets,
  RESPONSE_PACKET_TYPE,
  ResponseErrorReason,
  safeParseServerBoundPacket,
  safeParseResponseData,
  safeParseClientBoundPacket,
  successResponse,
} from '..';

describe('protocol v2 packet validation', () => {
  test('accepts notifications without request state', () => {
    const result = safeParseServerBoundPacket({
      type: ActionId.PlayerLeave,
      data: { playerUniqueId: 'player-1' },
    });
    expect(result.success).toBe(true);
  });

  test('rejects extra notification fields and invalid nested descriptors', () => {
    expect(
      safeParseServerBoundPacket({
        type: ActionId.PlayerLeave,
        requestId: 'unexpected',
        data: { playerUniqueId: 'player-1' },
      }).success,
    ).toBe(false);

    expect(
      safeParseServerBoundPacket({
        type: ActionId.WorldInitialize,
        requestId: 'initialize-1',
        data: {
          players: [
            {
              name: 'Player',
              nameTag: 'Player',
              uniqueId: 'player-1',
              pfid: 'pfid-1',
              platformType: 'not-a-platform',
            },
          ],
        },
      }).success,
    ).toBe(false);
  });

  test('validates request-specific response data', () => {
    expect(RequestPackets.find((packet) => packet.type === ActionId.GetTPS)).toBe(GetTpsPacket);
    expect(safeParseResponseData(ActionId.GetTPS, { tps: 20 }).success).toBe(true);
    expect(safeParseResponseData(ActionId.GetTPS, { tps: '20' }).success).toBe(false);
    expect(safeParseResponseData(ActionId.SendMessage, null).success).toBe(true);
    expect(safeParseResponseData(ActionId.SendMessage, undefined).success).toBe(false);
  });

  test('accepts only the common response envelope from the server', () => {
    expect(
      safeParseClientBoundPacket({
        type: RESPONSE_PACKET_TYPE,
        requestId: 'request-1',
        ok: true,
        data: null,
      }).success,
    ).toBe(true);
    expect(
      safeParseClientBoundPacket({
        type: RESPONSE_PACKET_TYPE,
        requestId: 'request-1',
        ok: false,
        error: { message: 'missing code' },
      }).success,
    ).toBe(false);
  });

  test('keeps transport-internal packets directional', () => {
    expect(
      safeParseServerBoundPacket({
        type: InternalAction.Ping,
        requestId: 'ping-1',
        data: { sentAt: 1 },
      }).success,
    ).toBe(false);
    expect(
      safeParseClientBoundPacket({
        type: InternalAction.Connect,
        requestId: 'connect-1',
        data: { clientId: 'client-1', protocolVersion: 2 },
      }).success,
    ).toBe(false);
  });
});

describe('PendingRequests', () => {
  test('registers the waiter before sending', async () => {
    const timers = new Map<number, () => void>();
    let nextTimer = 0;
    const pending = new PendingRequests<number>({
      set: (callback) => {
        const timer = ++nextTimer;
        timers.set(timer, callback);
        return timer;
      },
      clear: (timer) => {
        timers.delete(timer);
      },
    });

    const result = pending.request(ActionId.GetTPS, 'request-1', 100, () => {
      expect(pending.size).toBe(1);
      pending.handle(successResponse('request-1', { tps: 20 }));
    });

    expect(await result).toEqual({ error: false, data: { tps: 20 } });
    expect(pending.size).toBe(0);
    expect(pending.handle(successResponse('request-1', { tps: 19 }))).toBe(false);
  });

  test('turns invalid response data into an InvalidPayload result', async () => {
    const pending = new PendingRequests<number>({ set: () => 1, clear: () => {} });
    const result = pending.request(ActionId.GetTPS, 'request-2', 100, () => {});
    pending.handle(successResponse('request-2', { tps: 'invalid' }));
    expect(await result).toEqual({
      error: true,
      errorReason: ResponseErrorReason.InvalidPayload,
      message: `Invalid response data for ${ActionId.GetTPS}`,
    });
  });

  test('resolves timeouts and disconnect aborts with distinct reasons', async () => {
    const callbacks = new Map<number, () => void>();
    let nextTimer = 0;
    const pending = new PendingRequests<number>({
      set: (callback) => {
        const timer = ++nextTimer;
        callbacks.set(timer, callback);
        return timer;
      },
      clear: (timer) => callbacks.delete(timer),
    });

    const timedOut = pending.request(ActionId.GetTPS, 'timeout', 100, () => {});
    callbacks.get(1)?.();
    expect(await timedOut).toMatchObject({
      error: true,
      errorReason: ResponseErrorReason.Timeout,
    });

    const aborted = pending.request(ActionId.GetTPS, 'abort', 100, () => {});
    pending.abortAll('transport disconnected');
    expect(await aborted).toEqual({
      error: true,
      errorReason: ResponseErrorReason.Abort,
      message: 'transport disconnected',
    });
    expect(pending.size).toBe(0);
  });
});
