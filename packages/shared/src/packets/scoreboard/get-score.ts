import * as v from 'valibot';
import { ActionId } from '../../enums/action-id';
import { requestPacket } from '../common';
import { ScoreboardParticipantDescriptorSchema } from '../descriptors';

export const GetScorePacket = requestPacket(
  ActionId.GetScore,
  v.strictObject({
    objectiveId: v.string(),
    participant: ScoreboardParticipantDescriptorSchema,
  }),
  v.strictObject({ value: v.nullable(v.number()) }),
);
