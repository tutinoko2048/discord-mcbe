/// <reference types="bun-types" />

import { describe, expect, test } from 'bun:test';
import {
  AddonChannel,
  AddonFeature,
  safeParseAddonChatSend,
  safeParseAddonRegisterRequest,
  safeParseAddonRegisterResponse,
  safeParseAddonSendMessage,
  safeParseServerBoundPacket,
  ActionId,
} from '..';

describe('add-on payload validation', () => {
  test('keeps channel and feature names stable', () => {
    expect<string[]>(Object.values(AddonChannel)).toEqual([
      'dmc:ping',
      'dmc:register',
      'dmc:on_chat_send',
      'dmc:send_message',
      'dmc:connect',
      'dmc:disconnect',
    ]);
    expect<string[]>(Object.values(AddonFeature)).toEqual(['minecraft_chat']);
  });

  test('accepts a registration and ignores fields it does not know', () => {
    const result = safeParseAddonRegisterRequest({
      source: 'example-addon',
      protocol: 1,
      features: ['minecraft_chat', 'feature_from_the_future'],
      addedLater: true,
    });
    expect(result.success).toBe(true);
    expect(result.output).toEqual({
      source: 'example-addon',
      protocol: 1,
      features: ['minecraft_chat', 'feature_from_the_future'],
    });
  });

  test('rejects malformed registrations', () => {
    expect(safeParseAddonRegisterRequest(undefined).success).toBe(false);
    expect(safeParseAddonRegisterRequest({ source: '', protocol: 1, features: [] }).success).toBe(false);
    expect(safeParseAddonRegisterRequest({ source: 'example-addon', features: [] }).success).toBe(false);
    expect(
      safeParseAddonRegisterRequest({ source: 'example-addon', protocol: 1, features: 'minecraft_chat' })
        .success,
    ).toBe(false);
  });

  test('parses a registration response', () => {
    expect(
      safeParseAddonRegisterResponse({ protocol: 1, connected: false, features: ['minecraft_chat'] }).success,
    ).toBe(true);
    expect(safeParseAddonRegisterResponse({ protocol: 1, features: [] }).success).toBe(false);
  });

  test('accepts chat with or without formatting', () => {
    expect(
      safeParseAddonChatSend({ source: 'example-addon', playerId: '-4294967295', message: 'hello' }).success,
    ).toBe(true);

    const result = safeParseAddonChatSend({
      source: 'example-addon',
      playerId: '-4294967295',
      message: 'hello',
      formatting: { namePrefix: '[JP] ', futureField: 'ignored' },
    });
    expect(result.success).toBe(true);
    expect(result.output).toEqual({
      source: 'example-addon',
      playerId: '-4294967295',
      message: 'hello',
      formatting: { namePrefix: '[JP] ' },
    });
  });

  test('produces chat that fits the bridge packet', () => {
    const chat = safeParseAddonChatSend({
      source: 'example-addon',
      playerId: '-4294967295',
      message: 'hello',
      formatting: { namePrefix: '[JP] ', futureField: 'ignored' },
    });
    if (!chat.success) throw new Error('Expected the chat payload to be valid');

    const { source, playerId, message, formatting } = chat.output;
    expect(
      safeParseServerBoundPacket({
        type: ActionId.ChatSend,
        data: { senderName: 'Player', senderUniqueId: playerId, message, formatting, source },
      }).success,
    ).toBe(true);
  });

  test('rejects malformed chat', () => {
    const chat = { source: 'example-addon', playerId: '-4294967295', message: 'hello' };

    expect(safeParseAddonChatSend({ ...chat, playerId: '' }).success).toBe(false);
    expect(safeParseAddonChatSend({ ...chat, message: 1 }).success).toBe(false);
    expect(safeParseAddonChatSend({ ...chat, formatting: { namePrefix: 1 } }).success).toBe(false);
    expect(safeParseAddonChatSend({ ...chat, formatting: 'bold' }).success).toBe(false);
  });

  test('validates messages sent to Discord', () => {
    expect(
      safeParseAddonSendMessage({ source: 'example-addon', message: { content: 'hello' } }).success,
    ).toBe(true);
    expect(safeParseAddonSendMessage({ source: 'example-addon', message: 'hello' }).success).toBe(false);
    expect(safeParseAddonSendMessage({ source: '', message: { content: 'hello' } }).success).toBe(false);
  });
});
