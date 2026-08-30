import * as v from 'valibot';
import { ActionId } from '../../enums/action-id';
import { requestPacket } from '../common';
import { ScoreboardObjectiveDescriptorSchema } from '../descriptors';

export const UpdateObjectivePacket = requestPacket(
  ActionId.UpdateObjective,
  v.strictObject({
    type: v.picklist(['add', 'remove']),
    objectiveId: v.string(),
    displayName: v.optional(v.string()),
  }),
  v.strictObject({
    objective: v.optional(ScoreboardObjectiveDescriptorSchema),
  }),
);
