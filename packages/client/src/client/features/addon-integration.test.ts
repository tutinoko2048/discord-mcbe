/// <reference types="bun-types" />

import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { AddonDiscordChat } from '@discord-mcbe/shared';
import type { IBridgeClient } from '../../transport/interfaces';
import type { Logger } from '../../utils';

// The game modules only exist inside Minecraft, so the test replaces them.
const handlers = new Map<string, (payload: string) => unknown>();
const sent: { channel: string; payload: unknown }[] = [];

void mock.module('@minecraft/server', () => ({
  Player: class {},
  world: { getEntity: () => undefined },
}));
void mock.module('mcbe-ipc', () => ({
  PROTO: { Void: 'void', Boolean: 'boolean', String: 'string' },
  IPC: {
    handle: (channel: string, _req: unknown, _res: unknown, handler: (payload: string) => unknown) =>
      handlers.set(channel, handler),
    on: (channel: string, _type: unknown, handler: (payload: string) => unknown) =>
      handlers.set(channel, handler),
    send: (channel: string, _type: unknown, payload: unknown) => sent.push({ channel, payload }),
  },
}));

const { AddonIntegration } = await import('./addon-integration');

const author = { id: '1', username: 'steve', displayName: 'Steve', bot: false };
const chat: AddonDiscordChat = {
  text: '[Discord] <Steve> hi',
  message: {
    id: '100',
    channelId: '200',
    content: 'hi',
    author,
    member: null,
    attachments: [],
    mentions: { users: [], roles: [], everyone: false },
    referencedMessage: null,
  },
};

function setup() {
  const warn = mock();
  const logger = { info: mock(), warn } as unknown as Logger;
  const bridge = { isConnected: true, notify: mock() } as unknown as IBridgeClient;
  const integration = new AddonIntegration(bridge, logger);
  const register = (source: string, features: string[]) =>
    handlers.get('dmc:register')!(JSON.stringify({ source, protocol: 1, features }));
  return { integration, register, warn };
}

describe('relaying Discord chat to add-ons', () => {
  beforeEach(() => {
    handlers.clear();
    sent.length = 0;
  });

  test('keeps displaying it when no add-on registered', () => {
    const { integration } = setup();
    integration.setServerSettings({ allowAddonMessages: true });

    expect(integration.deliverDiscordChat(chat)).toBe(false);
    expect(sent).toEqual([]);
  });

  test('hands it to the add-on that registered `discord_chat`', () => {
    const { integration, register } = setup();
    integration.setServerSettings({ allowAddonMessages: true });
    register('example-addon', ['discord_chat']);

    expect(integration.deliverDiscordChat(chat)).toBe(true);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.channel).toBe('dmc:discord_chat');
    expect(JSON.parse(sent[0]!.payload as string)).toEqual(chat);
  });

  test('ignores a registration for another feature', () => {
    const { integration, register } = setup();
    integration.setServerSettings({ allowAddonMessages: true });
    register('example-addon', ['minecraft_chat']);

    expect(integration.deliverDiscordChat(chat)).toBe(false);
  });

  test('keeps displaying it until the server allows add-on messages', () => {
    const { integration, register } = setup();
    register('example-addon', ['discord_chat']);
    expect(integration.deliverDiscordChat(chat)).toBe(false);

    integration.setServerSettings({ allowAddonMessages: false });
    expect(integration.deliverDiscordChat(chat)).toBe(false);
    expect(sent).toEqual([]);
  });

  test('stops handing it over after a disconnect', () => {
    const { integration, register } = setup();
    integration.setServerSettings({ allowAddonMessages: true });
    register('example-addon', ['discord_chat']);

    integration.notifyDisconnect();
    sent.length = 0;

    expect(integration.deliverDiscordChat(chat)).toBe(false);
    expect(sent).toEqual([]);
  });

  test('warns when a second add-on registers `discord_chat`', () => {
    const { register, warn } = setup();
    register('first-addon', ['discord_chat']);
    expect(warn).not.toHaveBeenCalled();

    register('second-addon', ['discord_chat']);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
