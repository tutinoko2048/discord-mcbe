import type { BaseAction } from '@script-bridge/protocol';
import type { ActionId } from '../enums';
import type { UniqueId } from '../types';

export type KickPlayerAction = BaseAction<
  ActionId.KickPlayer,
  {
    playerUniqueId: UniqueId;
    reason?: string;
  },
  void
>;
