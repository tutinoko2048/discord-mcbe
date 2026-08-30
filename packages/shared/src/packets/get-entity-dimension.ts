import * as v from 'valibot';
import { ActionId } from '../enums/action-id';
import { requestPacket, UniqueIdSchema } from './common';
import { DimensionDescriptorSchema } from './descriptors';

export const GetEntityDimensionPacket = requestPacket(
  ActionId.GetEntityDimension,
  v.strictObject({ entityUniqueId: UniqueIdSchema }),
  v.strictObject({
    dimension: DimensionDescriptorSchema,
  }),
);
