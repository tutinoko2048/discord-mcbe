import type { BaseAction } from '../../protocol';
import type { ActionId } from '../../enums';
import type { ScoreboardObjectiveDescriptor } from '../../types';

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
