import * as v from 'valibot';
import { ActionId } from '../enums/action-id';
import { requestPacket, UniqueIdSchema } from './common';
import { Vector3Schema } from './descriptors';

export const GetEntityLocationPacket = requestPacket(
  ActionId.GetEntityLocation,
  v.strictObject({ entityUniqueId: UniqueIdSchema }),
  v.strictObject({ location: Vector3Schema }),
);
