import { BaseAction } from '@script-bridge/protocol';
import { ActionId } from '../../enums';
import { ScoreboardParticipantDescriptor } from '../../types';

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
