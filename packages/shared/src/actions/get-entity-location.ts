import type { Vector3 } from '@minecraft/server';
import type { BaseAction } from '@script-bridge/protocol';
import type { ActionId } from '../enums';

export type GetEntityLocationAction = BaseAction<
  ActionId.GetEntityLocation,
  {
    entityUniqueId: string;
  },
  {
    location: Vector3;
    dimensionId: string;
  }
>;
