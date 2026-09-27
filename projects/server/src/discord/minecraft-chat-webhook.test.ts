import { describe, expect, it } from 'bun:test';
import { createMinecraftChatWebhookMessage } from './minecraft-chat-webhook';
import { Pfid } from '@discord-mcbe/shared';

describe('createMinecraftChatWebhookMessage', () => {
  it('uses the player name and raw chat content for one world', () => {
    expect(
      createMinecraftChatWebhookMessage({
        worldName: 'main',
        worldCount: 1,
        senderName: 'Player One',
        pfid: 'xbl:123/456' as Pfid,
        content: 'hello',
      }),
    ).toEqual({ username: 'Player One', content: 'hello' });
  });

  it('prefixes the username with the world name and expands an avatar URL template', () => {
    expect(
      createMinecraftChatWebhookMessage({
        worldName: 'survival',
        worldCount: 2,
        senderName: 'Player One',
        pfid: 'xbl:123/456' as Pfid,
        content: 'hello',
        avatarUrlTemplate: 'https://example.com/faces/{name}/{pfid}',
      }),
    ).toEqual({
      username: 'survival | Player One',
      content: 'hello',
      avatarURL: 'https://example.com/faces/Player%20One/xbl%3A123%2F456',
    });
  });
});
