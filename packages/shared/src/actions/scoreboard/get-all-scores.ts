import type { BaseAction } from '../../protocol';
import type { ActionId } from '../../enums';
import type { ScoreboardScoreInfoDescriptor } from '../../types';

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
