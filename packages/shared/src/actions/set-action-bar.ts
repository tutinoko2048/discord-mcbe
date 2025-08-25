import type { RawMessage } from '@minecraft/server';
import type { BaseAction } from '@script-bridge/protocol';
import type { ActionId } from '../enums';
import { UniqueId } from '../types';

export type SetActionBarAction = BaseAction<
  ActionId.SetActionBar,
  {
    playerUniqueId: UniqueId;
    text: string | RawMessage | (string | RawMessage)[];
  },
  void
>;
