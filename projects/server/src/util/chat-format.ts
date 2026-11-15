import type { ChatFormatting } from '@discord-mcbe/shared';

export interface ChatDisplayInput {
  senderName: string;
  /** Message body without formatting. */
  message: string;
  formatting?: ChatFormatting;
  /** Whether to remove Minecraft color codes (`§` and the character after it). */
  stripColor: boolean;
}

export interface ChatDisplay {
  /** Sender name with its prefix and suffix applied. */
  senderName: string;
  /** Message with its prefix and suffix applied. */
  message: string;
  /** Sender name without decoration. */
  name: string;
  /** Empty when the sender name has no prefix. */
  namePrefix: string;
  /** Empty when the sender name has no suffix. */
  nameSuffix: string;
}

const COLOR_CODE = /§./g;

/**
 * Builds the sender name and message shown outside Minecraft from a chat message and its formatting.
 * The name is also returned in parts so a template can lay out the decoration on its own.
 */
export function formatChatDisplay({
  senderName,
  message,
  formatting = {},
  stripColor,
}: ChatDisplayInput): ChatDisplay {
  const finish = (text: string) => (stripColor ? text.replace(COLOR_CODE, '') : text);
  const namePrefix = formatting.namePrefix ?? '';
  const nameSuffix = formatting.nameSuffix ?? '';

  return {
    senderName: finish(`${namePrefix}${senderName}${nameSuffix}`),
    message: finish(`${formatting.messagePrefix ?? ''}${message}${formatting.messageSuffix ?? ''}`),
    name: finish(senderName),
    namePrefix: finish(namePrefix),
    nameSuffix: finish(nameSuffix),
  };
}
