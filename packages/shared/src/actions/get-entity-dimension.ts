import type { BaseAction } from '@script-bridge/protocol';
import type { ActionId } from '../enums';
import type { DimensionDescriptor, UniqueId } from '../types';

export type GetEntityDimensionAction = BaseAction<
  ActionId.GetEntityDimension,
  {
    entityUniqueId: UniqueId;
  },
  {
    dimension: DimensionDescriptor;
  }
>;
