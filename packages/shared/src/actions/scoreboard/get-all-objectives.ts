import { BaseAction } from '@script-bridge/protocol';
import { ActionId } from '../../enums';
import { ScoreboardObjectiveDescriptor } from '../../types';

/** minecraft-bound action */
export type GetAllObjectivesAction = BaseAction<
  ActionId.GetAllObjectives,
  void,
  {
    objectives: ScoreboardObjectiveDescriptor[];
  }
>;
