import { describe, expect, test } from 'bun:test';
import {
  ActionId,
  DisconnectReason,
  InternalAction,
  RESPONSE_PACKET_TYPE,
  ResponseErrorReason,
  SERVER_NET_BRIDGE_PROTOCOL_VERSION,
  WEBSOCKET_BRIDGE_PROTOCOL_VERSION,
} from '@discord-mcbe/shared';

describe('shared bridge protocol v2', () => {
  test('uses the same protocol version for both transports', () => {
    expect(WEBSOCKET_BRIDGE_PROTOCOL_VERSION).toBe(2);
    expect(SERVER_NET_BRIDGE_PROTOCOL_VERSION).toBe(2);
  });

  test('keeps fixed packet names explicit', () => {
    expect(RESPONSE_PACKET_TYPE).toBe('__internal__:response');
    expect<string[]>([InternalAction.Connect, InternalAction.Disconnect, InternalAction.Ping]).toEqual([
      '__internal__:connect',
      '__internal__:disconnect',
      '__internal__:ping',
    ]);
    expect<string[]>([
      ActionId.WorldInitialize,
      ActionId.PlayerJoin,
      ActionId.PlayerLeave,
      ActionId.ChatSend,
    ]).toEqual(['dm:world_initialize', 'dm:player_join', 'dm:player_leave', 'dm:chat_send']);
  });

  test('keeps disconnect and error codes stable', () => {
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
      ResponseErrorReason.InternalError,
      ResponseErrorReason.InvalidPayload,
    ]).toEqual([1, 2, 3, 4, 5]);
  });
});
