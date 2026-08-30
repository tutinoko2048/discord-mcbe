import * as v from 'valibot';
import { ActionId, DisplaySlotId, ObjectiveSortOrder } from '../../enums';
import { requestPacket } from '../common';

export const SetObjectiveDisplayPacket = requestPacket(
  ActionId.SetObjectiveDisplay,
  v.strictObject({
    displaySlotId: v.enum(DisplaySlotId),
    objectiveId: v.optional(v.string()),
    sortOrder: v.optional(v.enum(ObjectiveSortOrder)),
  }),
  v.null(),
);
