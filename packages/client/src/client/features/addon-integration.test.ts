/// <reference types="bun-types" />

import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { AddonDiscordChat } from '@discord-mcbe/shared';
import type { IBridgeClient } from '../../transport/interfaces';
import type { Logger } from '../../utils';

// The game modules only exist inside Minecraft, so the test replaces them and the two providers.
class FakePlayer {
  readonly id = 'player-1';
  readonly name = 'Steve';
}

const ipcHandlers = new Map<string, (payload: string) => unknown>();
const ipcSent: { channel: string; payload: unknown }[] = [];
let onWorldLoad: (() => void) | undefined;

type RpcHandler = (params: unknown, from: string) => unknown;

const sync = {
  started: false,
  rpcHandlers: new Map<string, RpcHandler>(),
  events: [] as { name: string; payload: unknown }[],
  state: new Map<string, unknown>(),
  peerDown: undefined as ((peer: { id: string }) => void) | undefined,
};

void mock.module('@minecraft/server', () => ({
  Player: FakePlayer,
  world: {
    getEntity: (id: string) => (id === 'player-1' ? new FakePlayer() : undefined),
    afterEvents: { worldLoad: { subscribe: (callback: () => void) => (onWorldLoad = callback) } },
  },
}));
void mock.module('mcbe-ipc', () => ({
  PROTO: { Void: 'void', Boolean: 'boolean', String: 'string' },
  IPC: {
    handle: (channel: string, _req: unknown, _res: unknown, handler: (payload: string) => unknown) =>
      ipcHandlers.set(channel, handler),
    on: (channel: string, _type: unknown, handler: (payload: string) => unknown) =>
      ipcHandlers.set(channel, handler),
    send: (channel: string, _type: unknown, payload: unknown) => ipcSent.push({ channel, payload }),
  },
}));
void mock.module('@bedrock-core/sync', () => ({
  createSync: () => ({
    start: () => (sync.started = true),
    rpc: { onRequest: (method: string, handler: RpcHandler) => sync.rpcHandlers.set(method, handler) },
    events: { emit: (name: string, payload?: unknown) => sync.events.push({ name, payload }) },
    state: {
      set: (namespace: string, key: string, value: unknown) => sync.state.set(`${namespace}/${key}`, value),
    },
    discovery: { onPeerDown: (listener: (peer: { id: string }) => void) => (sync.peerDown = listener) },
  }),
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

function setup({ connected = true } = {}) {
  const warn = mock();
  const notify = mock();
  const logger = { info: mock(), warn } as unknown as Logger;
  const bridge = { isConnected: connected, notify } as unknown as IBridgeClient;
  const integration = new AddonIntegration(bridge, logger);
  onWorldLoad?.();

  const register = (source: string, features: string[]) =>
    JSON.parse(
      ipcHandlers.get('dmc:register')!(JSON.stringify({ source, protocol: 1, features })) as string,
    ) as unknown;
  const request = (method: string, params: unknown, from: string) =>
    sync.rpcHandlers.get(method)!(params, from);
  return { integration, register, request, warn, notify };
}

beforeEach(() => {
  ipcHandlers.clear();
  ipcSent.length = 0;
  onWorldLoad = undefined;
  sync.started = false;
  sync.rpcHandlers.clear();
  sync.events.length = 0;
  sync.state.clear();
  sync.peerDown = undefined;
});

describe('relaying Discord chat to add-ons', () => {
  test('keeps displaying it when no add-on registered', () => {
    const { integration } = setup();
    integration.setServerSettings({ allowAddonMessages: true });

    expect(integration.deliverDiscordChat(chat)).toBe(false);
    expect(ipcSent).toEqual([]);
    expect(sync.events).toEqual([]);
  });

  test('hands it to the add-on that registered `discord_chat` over MCBE-IPC', () => {
    const { integration, register } = setup();
    integration.setServerSettings({ allowAddonMessages: true });
    register('example-addon', ['discord_chat']);

    expect(integration.deliverDiscordChat(chat)).toBe(true);
    expect(ipcSent).toHaveLength(1);
    expect(ipcSent[0]!.channel).toBe('dmc:discord_chat');
    expect(JSON.parse(ipcSent[0]!.payload as string)).toEqual(chat);
    expect(sync.events).toEqual([]);
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
    expect(ipcSent).toEqual([]);
  });

  test('stops handing it over after a disconnect', () => {
    const { integration, register } = setup();
    integration.setServerSettings({ allowAddonMessages: true });
    register('example-addon', ['discord_chat']);

    integration.notifyDisconnect();
    ipcSent.length = 0;

    expect(integration.deliverDiscordChat(chat)).toBe(false);
    expect(ipcSent).toEqual([]);
  });

  test('warns when a second add-on registers `discord_chat`', () => {
    const { register, warn } = setup();
    register('first-addon', ['discord_chat']);
    expect(warn).not.toHaveBeenCalled();

    register('second-addon', ['discord_chat']);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe('add-ons on @bedrock-core/sync', () => {
  test('starts the node once the world has loaded and publishes the connection state', () => {
    setup({ connected: false });

    expect(sync.started).toBe(true);
    expect(sync.state.get('discord-mcbe/connected')).toBe(false);
  });

  test('registers the calling add-on under its node ID', () => {
    const { request } = setup();

    expect(
      request(
        'register',
        { protocol: 1, features: ['discord_chat', 'feature_from_the_future'] },
        'sync-addon',
      ),
    ).toEqual({
      protocol: 1,
      connected: true,
      features: ['discord_chat'],
    });
    expect(() => request('register', { features: 'discord_chat' }, 'sync-addon')).toThrow();
  });

  test('emits Discord chat as an event, without a JSON string', () => {
    const { integration, request } = setup();
    integration.setServerSettings({ allowAddonMessages: true });
    request('register', { protocol: 1, features: ['discord_chat'] }, 'sync-addon');

    expect(integration.deliverDiscordChat(chat)).toBe(true);
    expect(sync.events).toEqual([{ name: 'discordChat', payload: chat }]);
    expect(ipcSent).toEqual([]);
  });

  test('uses both providers when add-ons on each display the chat', () => {
    const { integration, register, request } = setup();
    integration.setServerSettings({ allowAddonMessages: true });
    register('ipc-addon', ['discord_chat']);
    request('register', { protocol: 1, features: ['discord_chat'] }, 'sync-addon');

    expect(integration.deliverDiscordChat(chat)).toBe(true);
    expect(ipcSent).toHaveLength(1);
    expect(sync.events).toHaveLength(1);
  });

  test('forgets an add-on that left the world', () => {
    const { integration, request } = setup();
    integration.setServerSettings({ allowAddonMessages: true });
    request('register', { protocol: 1, features: ['discord_chat', 'minecraft_chat'] }, 'sync-addon');
    expect(integration.isMinecraftChatDelegated).toBe(true);

    sync.peerDown!({ id: 'sync-addon' });

    expect(integration.isMinecraftChatDelegated).toBe(false);
    expect(integration.deliverDiscordChat(chat)).toBe(false);
  });

  test('keeps an MCBE-IPC registration when a sync peer of the same name leaves', () => {
    const { integration, register } = setup();
    integration.setServerSettings({ allowAddonMessages: true });
    register('example-addon', ['minecraft_chat']);

    sync.peerDown!({ id: 'example-addon' });

    expect(integration.isMinecraftChatDelegated).toBe(true);
  });

  test('passes reported chat to the server and tells the caller', () => {
    const { request, notify } = setup();
    const report = { playerId: 'player-1', message: 'hello', formatting: { namePrefix: '[JP] ' } };

    // Not registered for `minecraft_chat` yet.
    expect(request('chatSend', report, 'sync-addon')).toBe(false);

    request('register', { protocol: 1, features: ['minecraft_chat'] }, 'sync-addon');
    expect(request('chatSend', report, 'sync-addon')).toBe(true);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0]![0]).toEqual({
      type: 'dm:chat_send',
      data: {
        senderName: 'Steve',
        senderUniqueId: 'player-1',
        message: 'hello',
        formatting: { namePrefix: '[JP] ' },
        source: 'sync-addon',
      },
    });

    expect(request('chatSend', { ...report, playerId: 'unknown' }, 'sync-addon')).toBe(false);
    expect(() => request('chatSend', { message: 1 }, 'sync-addon')).toThrow();
  });

  test('sends messages to Discord while connected', () => {
    const online = setup();
    expect(online.request('sendMessage', { message: { content: 'hello' } }, 'sync-addon')).toBe(true);
    expect(online.notify).toHaveBeenCalledTimes(1);

    const offline = setup({ connected: false });
    expect(offline.request('sendMessage', { message: { content: 'hello' } }, 'sync-addon')).toBe(false);
    expect(offline.notify).not.toHaveBeenCalled();
  });

  test('announces connection changes as events and state', () => {
    const { integration } = setup();

    integration.notifyConnect();
    expect(sync.state.get('discord-mcbe/connected')).toBe(true);
    integration.notifyDisconnect();
    expect(sync.state.get('discord-mcbe/connected')).toBe(false);
    expect(sync.events.map((event) => event.name)).toEqual(['connect', 'disconnect']);
  });
});
