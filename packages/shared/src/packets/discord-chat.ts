import * as v from 'valibot';
import { ActionId } from '../enums/action-id';
import { requestPacket } from './common';

/** A chat message relayed from Discord. An add-on may display it in place of discord-mcbe. */
export const DiscordChatPacket = requestPacket(
  ActionId.DiscordChat,
  v.strictObject({
    /** Ready-to-display text built from the translation templates. */
    text: v.string(),
  }),
  v.null(),
);
