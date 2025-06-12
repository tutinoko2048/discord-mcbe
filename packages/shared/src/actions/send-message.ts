import type { RawMessage } from '@minecraft/server';
import type { BaseAction } from '@script-bridge/protocol';
import type { ActionId } from '../enums';

export type SendMessageAction = BaseAction<
  ActionId.SendMessage,
  {
    message: string | RawMessage | (string | RawMessage)[];
  },
  void
>;
