import * as v from 'valibot';
import { ActionId } from '../../enums/action-id';
import { requestPacket } from '../common';
import { ScoreboardParticipantDescriptorSchema } from '../descriptors';

export const UpdateScorePacket = requestPacket(
  ActionId.UpdateScore,
  v.strictObject({
    type: v.picklist(['set', 'add']),
    objectiveId: v.string(),
    participant: ScoreboardParticipantDescriptorSchema,
    score: v.number(),
  }),
  v.strictObject({ value: v.number() }),
);
