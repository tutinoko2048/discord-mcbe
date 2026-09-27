import { Pfid } from '@discord-mcbe/shared';
import type { WebhookMessageCreateOptions } from 'discord.js';

export interface MinecraftChatWebhookInput {
  worldName: string;
  worldCount: number;
  senderName: string;
  pfid: Pfid;
  content: string;
  avatarUrlTemplate?: string;
}

export function createMinecraftChatWebhookMessage({
  worldName,
  worldCount,
  senderName,
  pfid,
  content,
  avatarUrlTemplate,
}: MinecraftChatWebhookInput): WebhookMessageCreateOptions {
  const username = (worldCount > 1 ? `${worldName} | ${senderName}` : senderName).slice(0, 80);
  const avatarURL = avatarUrlTemplate
    ?.replaceAll('{name}', encodeURIComponent(senderName))
    .replaceAll('{pfid}', encodeURIComponent(pfid));

  return {
    username,
    content,
    ...(avatarURL ? { avatarURL } : {}),
  };
}
