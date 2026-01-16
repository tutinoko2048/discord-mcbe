import type { BaseAction } from '@script-bridge/protocol';
import type { ActionId } from '../../enums';
import type { ScoreboardParticipantDescriptor } from '../../types';

/** minecraft-bound action */
export type RemoveParticipantAction = BaseAction<
  ActionId.RemoveParticipant,
  {
    objectiveId: string;
    participant: ScoreboardParticipantDescriptor;
  },
  {
    result: boolean;
  }
>;
