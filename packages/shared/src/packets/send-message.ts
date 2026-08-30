import * as v from 'valibot';
import { ActionId } from '../enums/action-id';
import { requestPacket, UniqueIdSchema } from './common';
import { MinecraftMessageSchema } from './minecraft-message';

export const SendMessagePacket = requestPacket(
  ActionId.SendMessage,
  v.strictObject({
    message: MinecraftMessageSchema,
    playerUniqueId: v.optional(UniqueIdSchema),
  }),
  v.null(),
);
