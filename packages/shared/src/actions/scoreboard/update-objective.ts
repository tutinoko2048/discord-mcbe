import type { BaseAction } from '../../protocol';
import type { ActionId } from '../../enums';
import type { ScoreboardObjectiveDescriptor } from '../../types';

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
