import type { RawMessage } from '@minecraft/server';
import type { BaseAction } from '../protocol';
import type { ActionId } from '../enums';
import type { UniqueId } from '../types';

export type SendMessageAction = BaseAction<
  ActionId.SendMessage,
  {
    message: string | RawMessage | (string | RawMessage)[];
    playerUniqueId?: UniqueId;
  },
  void
>;
