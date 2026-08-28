import type { BaseAction } from '../../protocol';
import type { ActionId } from '../../enums';
import type { ScoreboardParticipantDescriptor } from '../../types';

/** minecraft-bound action */
export type GetScoreAction = BaseAction<
  ActionId.GetScore,
  {
    objectiveId: string;
    participant: ScoreboardParticipantDescriptor;
  },
  {
    value: number | null;
  }
>;
