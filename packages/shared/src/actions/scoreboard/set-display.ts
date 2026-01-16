import type { BaseAction } from '@script-bridge/protocol';
import type { ActionId, DisplaySlotId, ObjectiveSortOrder } from '../../enums';

/** minecraft-bound action */
export type SetObjectiveDisplayAction = BaseAction<
  ActionId.SetObjectiveDisplay,
  {
    displaySlotId: DisplaySlotId;
    objectiveId?: string;
    sortOrder?: ObjectiveSortOrder;
  },
  void
>;
