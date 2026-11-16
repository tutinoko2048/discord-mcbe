import * as v from 'valibot';
import { AddonChatSendSchema, AddonRegisterRequestSchema, AddonSendMessageSchema } from './common';

// What add-ons use to reach discord-mcbe over MCBE-IPC. Exported as `AddonIpc`.

/** Channels discord-mcbe exposes. */
export enum Channel {
  /** invoke: whether discord-mcbe is connected to its server. */
  Ping = 'dmc:ping',
  /** invoke: registers an add-on and the features it uses. */
  Register = 'dmc:register',
  /** send (add-on → discord-mcbe): reports a chat message handled by the add-on. */
  ChatSend = 'dmc:on_chat_send',
  /** send (add-on → discord-mcbe): sends a message to Discord. */
  SendMessage = 'dmc:send_message',
  /** send (discord-mcbe → add-ons): the connection to the server has started. */
  Connect = 'dmc:connect',
  /** send (discord-mcbe → add-ons): the connection to the server has ended. */
  Disconnect = 'dmc:disconnect',
  /** send (discord-mcbe → add-ons): a chat message relayed from Discord, for the add-on to display. */
  DiscordChat = 'dmc:discord_chat',
}

// MCBE-IPC cannot tell which add-on sent a payload, so each of them names its sender.
const sourceEntries = {
  /** Name of the add-on. Every payload of one add-on must use the same value. */
  source: v.pipe(v.string(), v.minLength(1)),
};

/** Payload of `dmc:register`. */
export const RegisterRequestSchema = v.object({ ...sourceEntries, ...AddonRegisterRequestSchema.entries });
export type RegisterRequest = v.InferOutput<typeof RegisterRequestSchema>;

/** Payload of `dmc:on_chat_send`. */
export const ChatSendSchema = v.object({ ...sourceEntries, ...AddonChatSendSchema.entries });
export type ChatSend = v.InferOutput<typeof ChatSendSchema>;

/** Payload of `dmc:send_message`. */
export const SendMessageSchema = v.object({ ...sourceEntries, ...AddonSendMessageSchema.entries });
export type SendMessage = v.InferOutput<typeof SendMessageSchema>;

export function safeParseRegisterRequest(input: unknown) {
  return v.safeParse(RegisterRequestSchema, input);
}

export function safeParseChatSend(input: unknown) {
  return v.safeParse(ChatSendSchema, input);
}

export function safeParseSendMessage(input: unknown) {
  return v.safeParse(SendMessageSchema, input);
}
