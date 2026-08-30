import * as v from 'valibot';
import { ActionId } from '../enums/action-id';
import { requestPacket, UniqueIdSchema } from './common';
import { MinecraftMessageSchema } from './minecraft-message';

export const UpdateSubtitlePacket = requestPacket(
  ActionId.UpdateSubtitle,
  v.strictObject({
    playerUniqueId: UniqueIdSchema,
    subtitle: MinecraftMessageSchema,
  }),
  v.null(),
);
