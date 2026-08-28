import { describe, expect, test } from 'bun:test';
import {
  DisconnectReason,
  InternalAction,
  NamespaceRequiredError,
  PayloadType,
  ResponseErrorReason,
} from '@discord-mcbe/shared';

describe('shared bridge protocol', () => {
  test('keeps the wire values used by BDS and local add-ons', () => {
    expect([PayloadType.Request, PayloadType.Response]).toEqual([0, 1]);
    expect([
      DisconnectReason.Disconnect,
      DisconnectReason.OutdatedServer,
      DisconnectReason.OutdatedClient,
      DisconnectReason.ConnectionLost,
    ]).toEqual([0, 1, 2, 3]);
    expect([
      ResponseErrorReason.Abort,
      ResponseErrorReason.Timeout,
      ResponseErrorReason.InvalidSession,
      ResponseErrorReason.UnhandledRequest,
      ResponseErrorReason.InternalError,
      ResponseErrorReason.InvalidPayload,
    ]).toEqual([1, 2, 3, 4, 5, 6]);
    expect<string[]>([InternalAction.Connect, InternalAction.Disconnect, InternalAction.Ping]).toEqual([
      '__internal__:connect',
      '__internal__:disconnect',
      '__internal__:ping',
    ]);
  });

  test('retains namespace error context', () => {
    const error = new NamespaceRequiredError('echo');
    expect(error).toBeInstanceOf(Error);
    expect(error.channelId).toBe('echo');
    expect(error.message).toBe('Channel ID "echo" must include a namespace');
  });
});
