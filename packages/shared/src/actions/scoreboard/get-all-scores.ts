import { BaseAction } from '@script-bridge/protocol';
import { ActionId } from '../../enums';
import { ScoreboardScoreInfoDescriptor } from '../../types';

/** minecraft-bound action */
export type GetAllScoresAction = BaseAction<
  ActionId.GetAllScores,
  {
    objectiveId: string;
  },
  {
    scores: ScoreboardScoreInfoDescriptor[];
  }
>;
