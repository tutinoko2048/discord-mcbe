import type { Vector3 } from '@minecraft/server';
import type { BaseAction } from '../protocol';
import type { ActionId } from '../enums';
import type { UniqueId } from '../types';

export type GetEntityLocationAction = BaseAction<
  ActionId.GetEntityLocation,
  {
    entityUniqueId: UniqueId;
  },
  {
    location: Vector3;
  }
>;
