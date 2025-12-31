import { BaseAction } from '@script-bridge/protocol';
import { ActionId } from '../../enums';
import { ScoreboardParticipantDescriptor } from '../../types';

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
