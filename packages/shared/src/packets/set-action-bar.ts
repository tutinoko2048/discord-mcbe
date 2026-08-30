import * as v from 'valibot';
import { ActionId } from '../enums/action-id';
import { requestPacket, UniqueIdSchema } from './common';
import { MinecraftMessageSchema } from './minecraft-message';

export const SetActionBarPacket = requestPacket(
  ActionId.SetActionBar,
  v.strictObject({
    playerUniqueId: UniqueIdSchema,
    text: MinecraftMessageSchema,
  }),
  v.null(),
);
