import { BaseAction } from '@script-bridge/protocol';
import { ActionId } from '../../enums';
import { ScoreboardParticipantDescriptor } from '../../types';

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
