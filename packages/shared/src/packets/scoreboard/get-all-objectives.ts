import * as v from 'valibot';
import { ActionId } from '../../enums/action-id';
import { requestPacket } from '../common';
import { ScoreboardObjectiveDescriptorSchema } from '../descriptors';

export const GetAllObjectivesPacket = requestPacket(
  ActionId.GetAllObjectives,
  v.null(),
  v.strictObject({
    objectives: v.array(ScoreboardObjectiveDescriptorSchema),
  }),
);
