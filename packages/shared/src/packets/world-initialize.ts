import * as v from 'valibot';
import { ActionId } from '../enums/action-id';
import { requestPacket } from './common';
import { PlayerDescriptorSchema } from './descriptors';

export const WorldInitializePacket = requestPacket(
  ActionId.WorldInitialize,
  v.strictObject({ players: v.array(PlayerDescriptorSchema) }),
  v.null(),
);
