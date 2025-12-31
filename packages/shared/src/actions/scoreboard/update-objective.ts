import { BaseAction } from '@script-bridge/protocol';
import { ActionId } from '../../enums';
import { ScoreboardObjectiveDescriptor } from '../../types';

/** minecraft-bound action */
export type UpdateObjectiveAction = BaseAction<
  ActionId.UpdateObjective,
  {
    type: 'add' | 'remove';
    objectiveId: string;
    displayName?: string;
  },
  {
    objective?: ScoreboardObjectiveDescriptor;
  }
>;
