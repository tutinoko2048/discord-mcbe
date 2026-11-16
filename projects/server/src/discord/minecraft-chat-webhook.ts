import { Pfid } from '@discord-mcbe/shared';
import type { WebhookMessageCreateOptions } from 'discord.js';

export interface MinecraftChatWebhookInput {
  worldName: string;
  worldCount: number;
  /** Player name without decoration. Used for the avatar URL. */
  senderName: string;
  /** Name shown as the webhook username. Defaults to `senderName`. */
  displayName?: string;
  pfid: Pfid;
  content: string;
  avatarUrlTemplate?: string;
}

export function createMinecraftChatWebhookMessage({
  worldName,
  worldCount,
  senderName,
  displayName = senderName,
  pfid,
  content,
  avatarUrlTemplate,
}: MinecraftChatWebhookInput): WebhookMessageCreateOptions {
  const username = (worldCount > 1 ? `${worldName} | ${displayName}` : displayName).slice(0, 80);
  const avatarURL = avatarUrlTemplate
    ?.replaceAll('{name}', encodeURIComponent(senderName))
    .replaceAll('{pfid}', encodeURIComponent(pfid));

  return {
    username,
    content,
    ...(avatarURL ? { avatarURL } : {}),
  };
}
