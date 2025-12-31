import { BaseAction } from '@script-bridge/protocol';
import { ActionId } from '../../enums';
import { ScoreboardObjectiveDescriptor } from '../../types';

/** minecraft-bound action */
export type GetObjectiveAction = BaseAction<
  ActionId.GetObjective,
  {
    objectiveId: string;
  },
  {
    objective?: ScoreboardObjectiveDescriptor;
  }
>;
