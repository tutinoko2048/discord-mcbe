import * as v from 'valibot';
import { ChatFormattingSchema } from '../packets/chat-send';
import { DiscordMessageSchema } from '../packets/discord-send';

/** Version of the add-on facing payloads defined here. */
export const ADDON_PROTOCOL_VERSION = 1;

// Add-ons are released separately from discord-mcbe, so these schemas use `v.object`:
// fields they do not know are ignored instead of rejected.

const AddonSourceSchema = v.pipe(v.string(), v.minLength(1));

/** Request of `dmc:register`. */
export const AddonRegisterRequestSchema = v.object({
  /** Name of the add-on. Later payloads must use the same value. */
  source: AddonSourceSchema,
  protocol: v.number(),
  /** Requested features. Values discord-mcbe does not know are skipped. */
  features: v.array(v.string()),
});
export type AddonRegisterRequest = v.InferOutput<typeof AddonRegisterRequestSchema>;

/** Response of `dmc:register`. */
export const AddonRegisterResponseSchema = v.object({
  protocol: v.number(),
  /** Whether discord-mcbe was connected to its server when it answered. */
  connected: v.boolean(),
  /** Requested features that discord-mcbe accepted. */
  features: v.array(v.string()),
});
export type AddonRegisterResponse = v.InferOutput<typeof AddonRegisterResponseSchema>;

/** Payload of `dmc:on_chat_send`. */
export const AddonChatSendSchema = v.object({
  source: AddonSourceSchema,
  /** `Player.id` of the sender. */
  playerId: v.pipe(v.string(), v.minLength(1)),
  /** Message body without any formatting applied. */
  message: v.string(),
  formatting: v.optional(v.object(ChatFormattingSchema.entries)),
});
export type AddonChatSend = v.InferOutput<typeof AddonChatSendSchema>;

/** Payload of `dmc:send_message`. */
export const AddonSendMessageSchema = v.object({
  source: AddonSourceSchema,
  message: DiscordMessageSchema,
});
export type AddonSendMessage = v.InferOutput<typeof AddonSendMessageSchema>;

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
