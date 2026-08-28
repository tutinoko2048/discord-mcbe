import type { BaseAction } from '../protocol';
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
