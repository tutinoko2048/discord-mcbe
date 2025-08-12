import type { BaseAction } from '@script-bridge/protocol';
import type { ActionId } from '../enums';

export type ChatSendAction = BaseAction<
  ActionId.ChatSend,
  {
    senderName: string;
    senderUniqueId: string;
    message: string;
  },
  void
>;
