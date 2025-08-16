import type { RawMessage } from '@minecraft/server';
import type { BaseAction } from '@script-bridge/protocol';
import type { ActionId } from '../enums';

export type SetActionBarAction = BaseAction<
  ActionId.SetActionBar,
  {
    playerUniqueId: string;
    text: string | RawMessage | (string | RawMessage)[];
  },
  void
>;
