import type { BaseAction } from '../../protocol';
import type { ActionId } from '../../enums';
import type { ScoreboardParticipantDescriptor } from '../../types';

/** minecraft-bound action */
export type UpdateScoreAction = BaseAction<
  ActionId.UpdateScore,
  {
    type: 'set' | 'add';
    objectiveId: string;
    participant: ScoreboardParticipantDescriptor;
    score: number;
  },
  {
    value: number;
  }
>;
