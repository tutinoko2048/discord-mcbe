import type { BaseAction } from '@script-bridge/protocol';
import type { ActionId } from '../../enums';
import type { ScoreboardObjectiveDescriptor } from '../../types';

/** minecraft-bound action */
export type GetAllObjectivesAction = BaseAction<
  ActionId.GetAllObjectives,
  void,
  {
    objectives: ScoreboardObjectiveDescriptor[];
  }
>;
