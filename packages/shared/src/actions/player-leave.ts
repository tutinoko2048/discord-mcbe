import type { BaseAction } from '@script-bridge/protocol';
import type { ActionId } from '../enums';

export type PlayerLeaveAction = BaseAction<
  ActionId.PlayerLeave,
  { playerUniqueId: string },
  void
>;
