import * as v from 'valibot';
import { ActionId } from '../enums/action-id';
import { notificationPacket, UniqueIdSchema } from './common';

export const PlayerLeavePacket = notificationPacket(
  ActionId.PlayerLeave,
  v.strictObject({ playerUniqueId: UniqueIdSchema }),
);
