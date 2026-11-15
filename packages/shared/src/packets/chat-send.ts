import * as v from 'valibot';
import { ActionId } from '../enums/action-id';
import { notificationPacket, UniqueIdSchema } from './common';

/**
 * Decoration rendered around the sender name and the message.
 * Mirrors the four fields of the Bedrock protocol's chat formatting.
 */
export const ChatFormattingSchema = v.strictObject({
  namePrefix: v.optional(v.string()),
  nameSuffix: v.optional(v.string()),
  messagePrefix: v.optional(v.string()),
  messageSuffix: v.optional(v.string()),
});
export type ChatFormatting = v.InferOutput<typeof ChatFormattingSchema>;

export const ChatSendPacket = notificationPacket(
  ActionId.ChatSend,
  v.strictObject({
    senderName: v.string(),
    senderUniqueId: UniqueIdSchema,
    /** Message body without any formatting applied. */
    message: v.string(),
    formatting: v.optional(ChatFormattingSchema),
    /** Name of the add-on that reported this chat. Absent for chat relayed by discord-mcbe itself. */
    source: v.optional(v.pipe(v.string(), v.minLength(1))),
  }),
);
