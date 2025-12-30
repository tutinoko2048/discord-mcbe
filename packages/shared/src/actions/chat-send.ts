import type { BaseAction } from '@script-bridge/protocol';
import type { ActionId } from '../enums';
import type { UniqueId } from '../types';

export type ChatSendAction = BaseAction<
  ActionId.ChatSend,
  {
    senderName: string;
    senderUniqueId: UniqueId;
    message: string;
  },
  void
>;
