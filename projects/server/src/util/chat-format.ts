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
  senderName: string;
  message: string;
}

const COLOR_CODE = /§./g;

/** Builds the sender name and message shown outside Minecraft from a chat message and its formatting. */
export function formatChatDisplay({
  senderName,
  message,
  formatting = {},
  stripColor,
}: ChatDisplayInput): ChatDisplay {
  const finish = (text: string) => (stripColor ? text.replace(COLOR_CODE, '') : text);
  return {
    senderName: finish(`${formatting.namePrefix ?? ''}${senderName}${formatting.nameSuffix ?? ''}`),
    message: finish(`${formatting.messagePrefix ?? ''}${message}${formatting.messageSuffix ?? ''}`),
  };
}
