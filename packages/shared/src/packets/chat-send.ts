import * as v from 'valibot';
import { ActionId } from '../enums/action-id';
import { notificationPacket, UniqueIdSchema } from './common';

export const ChatSendPacket = notificationPacket(
  ActionId.ChatSend,
  v.strictObject({
    senderName: v.string(),
    senderUniqueId: UniqueIdSchema,
    message: v.string(),
  }),
);
