import * as v from 'valibot';
import { ActionId } from '../enums/action-id';
import { notificationPacket } from './common';
import { PlayerDescriptorSchema } from './descriptors';

export const PlayerJoinPacket = notificationPacket(
  ActionId.PlayerJoin,
  v.strictObject({ player: PlayerDescriptorSchema }),
);
