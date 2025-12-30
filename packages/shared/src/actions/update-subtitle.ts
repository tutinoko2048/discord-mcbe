import type { RawMessage } from '@minecraft/server';
import type { BaseAction } from '@script-bridge/protocol';
import type { ActionId } from '../enums';
import type { UniqueId } from '../types';

export type UpdateSubtitleAction = BaseAction<
  ActionId.UpdateSubtitle,
  {
    playerUniqueId: UniqueId;
    subtitle: string | RawMessage | (string | RawMessage)[];
  },
  void
>;
