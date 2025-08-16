import type { RawMessage } from '@minecraft/server';
import type { BaseAction } from '@script-bridge/protocol';
import type { ActionId } from '../enums';

export type UpdateSubtitleAction = BaseAction<
  ActionId.UpdateSubtitle,
  {
    playerUniqueId: string;
    subtitle: string | RawMessage | (string | RawMessage)[];
  },
  void
>;
