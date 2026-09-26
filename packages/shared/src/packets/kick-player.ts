import * as v from 'valibot';
import { ActionId } from '../enums/action-id';
import { requestPacket, UniqueIdSchema } from './common';

export const KickPlayerPacket = requestPacket(
  ActionId.KickPlayer,
  v.strictObject({
    playerUniqueId: UniqueIdSchema,
    reason: v.optional(v.string()),
  }),
  v.null(),
);
