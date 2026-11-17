/// <reference types="bun-types" />

import { describe, expect, test } from 'bun:test';
import {
  AddonIpc,
  AddonSync,
  AddonFeature,
  safeParseAddonDiscordChat,
  safeParseClientBoundPacket,
  safeParseAddonRegisterResponse,
  safeParseServerBoundPacket,
  ActionId,
} from '..';

describe('add-on payload validation', () => {
  test('keeps channel and feature names stable', () => {
    expect<string[]>(Object.values(AddonIpc.Channel)).toEqual([
      'dmc:ping',
      'dmc:register',
      'dmc:on_chat_send',
      'dmc:send_message',
      'dmc:connect',
      'dmc:disconnect',
      'dmc:discord_chat',
    ]);
    expect<string[]>(Object.values(AddonFeature)).toEqual(['minecraft_chat', 'discord_chat']);
    expect(AddonSync.NODE_ID).toBe('discord-mcbe');
    expect<string[]>(Object.values(AddonSync.Method)).toEqual(['register', 'chatSend', 'sendMessage']);
    expect<string[]>(Object.values(AddonSync.Event)).toEqual(['connect', 'disconnect', 'discordChat']);
    expect<string[]>(Object.values(AddonSync.StateKey)).toEqual(['connected']);
  });

  test('validates relayed Discord chat', () => {
    const author = { id: '1', username: 'steve', displayName: 'Steve', bot: false };
    const member = { displayName: 'Steve the Miner', roles: [{ id: '10', name: 'Admin' }] };
    const message = {
      id: '100',
      channelId: '200',
      content: 'hi',
      author,
      member,
      attachments: [
        { name: 'image.png', contentType: 'image/png' },
        { name: 'data.bin', contentType: null },
      ],
      mentions: { users: [author], roles: [{ id: '10', name: 'Admin' }], everyone: false },
      referencedMessage: { id: '99', content: 'hello', author, member: null },
    };
    const data = { text: '[Discord] <Steve the Miner> hi', message };
    const packet = { type: ActionId.DiscordChat, requestId: 'request-1' };

    expect(safeParseClientBoundPacket({ ...packet, data }).success).toBe(true);
    expect(
      safeParseClientBoundPacket({
        ...packet,
        data: { ...data, message: { ...message, member: null, referencedMessage: null } },
      }).success,
    ).toBe(true);
    expect(safeParseClientBoundPacket({ ...packet, data: { text: 'hi' } }).success).toBe(false);

    expect(safeParseAddonDiscordChat(data).success).toBe(true);
    expect(safeParseAddonDiscordChat({ text: 'hi' }).success).toBe(false);

    // Add-ons keep working when a later discord-mcbe adds fields at any depth.
    const future = safeParseAddonDiscordChat({
      ...data,
      future: 1,
      message: { ...message, future: 1, author: { ...author, future: 1 } },
    });
    expect(future.success).toBe(true);
    expect(future.output).toEqual(data);
  });

  test('accepts a registration and ignores fields it does not know', () => {
    const result = AddonIpc.safeParseRegisterRequest({
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
    expect(AddonIpc.safeParseRegisterRequest(undefined).success).toBe(false);
    expect(AddonIpc.safeParseRegisterRequest({ source: '', protocol: 1, features: [] }).success).toBe(false);
    expect(AddonIpc.safeParseRegisterRequest({ source: 'example-addon', features: [] }).success).toBe(false);
    expect(
      AddonIpc.safeParseRegisterRequest({ source: 'example-addon', protocol: 1, features: 'minecraft_chat' })
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
      AddonIpc.safeParseChatSend({ source: 'example-addon', playerId: '-4294967295', message: 'hello' })
        .success,
    ).toBe(true);

    const result = AddonIpc.safeParseChatSend({
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
    const chat = AddonIpc.safeParseChatSend({
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

    expect(AddonIpc.safeParseChatSend({ ...chat, playerId: '' }).success).toBe(false);
    expect(AddonIpc.safeParseChatSend({ ...chat, message: 1 }).success).toBe(false);
    expect(AddonIpc.safeParseChatSend({ ...chat, formatting: { namePrefix: 1 } }).success).toBe(false);
    expect(AddonIpc.safeParseChatSend({ ...chat, formatting: 'bold' }).success).toBe(false);
  });

  test('validates messages sent to Discord', () => {
    expect(
      AddonIpc.safeParseSendMessage({ source: 'example-addon', message: { content: 'hello' } }).success,
    ).toBe(true);
    expect(AddonIpc.safeParseSendMessage({ source: 'example-addon', message: 'hello' }).success).toBe(false);
    expect(AddonIpc.safeParseSendMessage({ source: '', message: { content: 'hello' } }).success).toBe(false);
  });
});
