import * as v from 'valibot';
import { ActionId } from '../enums/action-id';
import { notificationPacket } from './common';

export const DISCORD_MESSAGE_MAX_LENGTH = 2_000;

export const DiscordSendPacket = notificationPacket(
  ActionId.DiscordSend,
  v.strictObject({
    message: v.pipe(v.string(), v.minLength(1), v.maxLength(DISCORD_MESSAGE_MAX_LENGTH)),
  }),
);
