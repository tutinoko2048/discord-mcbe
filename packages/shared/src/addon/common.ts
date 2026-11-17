import * as v from 'valibot';
import { ChatFormattingSchema } from '../packets/chat-send';
import {
  DiscordChatAttachmentSchema,
  DiscordChatMemberSchema,
  DiscordChatMentionsSchema,
  DiscordChatMessageSchema,
  DiscordChatReferencedMessageSchema,
  DiscordChatRoleSchema,
  DiscordChatUserSchema,
} from '../packets/discord-chat';
import { DiscordMessageSchema } from '../packets/discord-send';

/** Version of the add-on facing payloads defined here. */
export const ADDON_PROTOCOL_VERSION = 1;

// Add-ons are released separately from discord-mcbe, so these schemas use `v.object`:
// fields they do not know are ignored instead of rejected.

// The payloads here are the same on MCBE-IPC and `@bedrock-core/sync`.
// What belongs to one of them lives in `AddonIpc` (./mcbe-ipc) and `AddonSync` (./bedrock-core).

/** Registration request: `dmc:register` on MCBE-IPC, `register` on `@bedrock-core/sync`. */
export const AddonRegisterRequestSchema = v.object({
  protocol: v.number(),
  /** Requested features. Values discord-mcbe does not know are skipped. */
  features: v.array(v.string()),
});
export type AddonRegisterRequest = v.InferOutput<typeof AddonRegisterRequestSchema>;

/** Response to a registration request. */
export const AddonRegisterResponseSchema = v.object({
  protocol: v.number(),
  /** Whether discord-mcbe was connected to its server when it answered. */
  connected: v.boolean(),
  /** Requested features that discord-mcbe accepted. */
  features: v.array(v.string()),
});
export type AddonRegisterResponse = v.InferOutput<typeof AddonRegisterResponseSchema>;

/** Chat handled by an add-on: `dmc:on_chat_send` on MCBE-IPC, `chatSend` on `@bedrock-core/sync`. */
export const AddonChatSendSchema = v.object({
  /** `Player.id` of the sender. */
  playerId: v.pipe(v.string(), v.minLength(1)),
  /** Message body without any formatting applied. */
  message: v.string(),
  formatting: v.optional(v.object(ChatFormattingSchema.entries)),
});
export type AddonChatSend = v.InferOutput<typeof AddonChatSendSchema>;

/** Message for Discord: `dmc:send_message` on MCBE-IPC, `sendMessage` on `@bedrock-core/sync`. */
export const AddonSendMessageSchema = v.object({
  message: DiscordMessageSchema,
});
export type AddonSendMessage = v.InferOutput<typeof AddonSendMessageSchema>;

const AddonDiscordUserSchema = v.object(DiscordChatUserSchema.entries);
const AddonDiscordRoleSchema = v.object(DiscordChatRoleSchema.entries);
const AddonDiscordMemberSchema = v.object({
  ...DiscordChatMemberSchema.entries,
  roles: v.array(AddonDiscordRoleSchema),
});

/** `message` of relayed Discord chat: a reduced form of the discord.js `Message`. */
export const AddonDiscordMessageSchema = v.object({
  ...DiscordChatMessageSchema.entries,
  author: AddonDiscordUserSchema,
  member: v.nullable(AddonDiscordMemberSchema),
  attachments: v.array(v.object(DiscordChatAttachmentSchema.entries)),
  mentions: v.object({
    ...DiscordChatMentionsSchema.entries,
    users: v.array(AddonDiscordUserSchema),
    roles: v.array(AddonDiscordRoleSchema),
  }),
  referencedMessage: v.nullable(
    v.object({
      ...DiscordChatReferencedMessageSchema.entries,
      author: AddonDiscordUserSchema,
      member: v.nullable(AddonDiscordMemberSchema),
    }),
  ),
});
export type AddonDiscordMessage = v.InferOutput<typeof AddonDiscordMessageSchema>;

/** Discord chat for an add-on to display: `dmc:discord_chat` on MCBE-IPC, `discordChat` on `@bedrock-core/sync`. */
export const AddonDiscordChatSchema = v.object({
  /** Ready-to-display text, already formatted by discord-mcbe. */
  text: v.string(),
  /** The Discord message `text` was built from. */
  message: AddonDiscordMessageSchema,
});
export type AddonDiscordChat = v.InferOutput<typeof AddonDiscordChatSchema>;

export function safeParseAddonDiscordChat(input: unknown) {
  return v.safeParse(AddonDiscordChatSchema, input);
}

export function safeParseAddonRegisterRequest(input: unknown) {
  return v.safeParse(AddonRegisterRequestSchema, input);
}

export function safeParseAddonRegisterResponse(input: unknown) {
  return v.safeParse(AddonRegisterResponseSchema, input);
}

export function safeParseAddonChatSend(input: unknown) {
  return v.safeParse(AddonChatSendSchema, input);
}

export function safeParseAddonSendMessage(input: unknown) {
  return v.safeParse(AddonSendMessageSchema, input);
}
