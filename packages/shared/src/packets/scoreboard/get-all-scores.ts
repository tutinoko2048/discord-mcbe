import * as v from 'valibot';
import { ActionId } from '../../enums/action-id';
import { requestPacket } from '../common';
import { ScoreboardScoreInfoDescriptorSchema } from '../descriptors';

export const GetAllScoresPacket = requestPacket(
  ActionId.GetAllScores,
  v.strictObject({ objectiveId: v.string() }),
  v.strictObject({
    scores: v.array(ScoreboardScoreInfoDescriptorSchema),
  }),
);
