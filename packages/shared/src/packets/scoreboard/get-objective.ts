import * as v from 'valibot';
import { ActionId } from '../../enums/action-id';
import { requestPacket } from '../common';
import { ScoreboardObjectiveDescriptorSchema } from '../descriptors';

export const GetObjectivePacket = requestPacket(
  ActionId.GetObjective,
  v.strictObject({ objectiveId: v.string() }),
  v.strictObject({
    objective: v.optional(ScoreboardObjectiveDescriptorSchema),
  }),
);
