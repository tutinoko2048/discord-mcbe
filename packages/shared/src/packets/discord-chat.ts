import * as v from 'valibot';
import { ActionId } from '../enums/action-id';
import { requestPacket } from './common';

// The shapes below follow discord.js (`Message`, `User`, `GuildMember`), reduced to what a script in the game can use.

export const DiscordChatUserSchema = v.strictObject({
  /** Discord user ID. */
  id: v.string(),
  username: v.string(),
  /** Name shown across Discord. Falls back to `username`. */
  displayName: v.string(),
  /** Always false for the sender, since chat from bots is not relayed. Can be true in `referencedMessage`. */
  bot: v.boolean(),
});
export type DiscordChatUser = v.InferOutput<typeof DiscordChatUserSchema>;

export const DiscordChatRoleSchema = v.strictObject({
  id: v.string(),
  name: v.string(),
});
export type DiscordChatRole = v.InferOutput<typeof DiscordChatRoleSchema>;

export const DiscordChatMemberSchema = v.strictObject({
  /** Name shown in the server: the nickname, or the user's display name. */
  displayName: v.string(),
  /** Roles from highest to lowest, without `@everyone`. */
  roles: v.array(DiscordChatRoleSchema),
});
export type DiscordChatMember = v.InferOutput<typeof DiscordChatMemberSchema>;

export const DiscordChatAttachmentSchema = v.strictObject({
  /** File name. */
  name: v.string(),
  /** Media type such as `image/png`, or `null` when Discord does not report one. */
  contentType: v.nullable(v.string()),
});
export type DiscordChatAttachment = v.InferOutput<typeof DiscordChatAttachmentSchema>;

export const DiscordChatMentionsSchema = v.strictObject({
  /** Mentioned users. Includes the author of the replied-to message when the reply pings them. */
  users: v.array(DiscordChatUserSchema),
  roles: v.array(DiscordChatRoleSchema),
  /** Whether `@everyone` or `@here` was used. */
  everyone: v.boolean(),
});
export type DiscordChatMentions = v.InferOutput<typeof DiscordChatMentionsSchema>;

/** The message a reply points at. */
export const DiscordChatReferencedMessageSchema = v.strictObject({
  id: v.string(),
  /** Text after the message filters, shortened to the reply preview length. */
  content: v.string(),
  author: DiscordChatUserSchema,
  /** `null` when the author is a webhook, such as relayed Minecraft chat, or has left the server. */
  member: v.nullable(DiscordChatMemberSchema),
});
export type DiscordChatReferencedMessage = v.InferOutput<typeof DiscordChatReferencedMessageSchema>;

export const DiscordChatMessageSchema = v.strictObject({
  id: v.string(),
  channelId: v.string(),
  /** Text after the message filters, with mentions already resolved to names. Empty when only files were sent. */
  content: v.string(),
  author: DiscordChatUserSchema,
  /** `null` only when Discord did not send the member with the message, which is rare. */
  member: v.nullable(DiscordChatMemberSchema),
  attachments: v.array(DiscordChatAttachmentSchema),
  mentions: DiscordChatMentionsSchema,
  /** The message this one replies to, or `null`. */
  referencedMessage: v.nullable(DiscordChatReferencedMessageSchema),
});
export type DiscordChatMessage = v.InferOutput<typeof DiscordChatMessageSchema>;

export const DiscordChatSchema = v.strictObject({
  /** Ready-to-display text built from the translation templates. */
  text: v.string(),
  /** The Discord message `text` was built from. */
  message: DiscordChatMessageSchema,
});
export type DiscordChat = v.InferOutput<typeof DiscordChatSchema>;

/** A chat message relayed from Discord. An add-on may display it in place of discord-mcbe. */
export const DiscordChatPacket = requestPacket(ActionId.DiscordChat, DiscordChatSchema, v.null());
