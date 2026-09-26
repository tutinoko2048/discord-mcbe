import * as v from 'valibot';
import { ActionId } from '../enums/action-id';
import { notificationPacket } from './common';

export type DiscordMessageJSON = Record<string, unknown>;

export const DiscordSendPacket = notificationPacket(
  ActionId.DiscordSend,
  v.strictObject({
    source: v.pipe(v.string(), v.minLength(1)),
    message: v.custom<DiscordMessageJSON>(
      (value) => typeof value === 'object' && value !== null && !Array.isArray(value),
    ),
  }),
);
