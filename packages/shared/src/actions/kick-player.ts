import type { BaseAction } from '@script-bridge/protocol';
import type { ActionId } from '../enums';

export type KickPlayerAction = BaseAction<
  ActionId.KickPlayer,
  {
    playerUniqueId: string;
    reason?: string;
  },
  void
>;
