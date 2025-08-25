import type { Vector3 } from '@minecraft/server';
import type { BaseAction } from '@script-bridge/protocol';
import type { ActionId } from '../enums';
import { UniqueId } from '../types';

export type GetEntityLocationAction = BaseAction<
  ActionId.GetEntityLocation,
  {
    entityUniqueId: UniqueId;
  },
  {
    location: Vector3;
  }
>;
