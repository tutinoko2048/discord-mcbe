import type { BaseAction } from '@script-bridge/protocol';
import type { ActionId } from '../enums';

export type SendScriptEventAction = BaseAction<
  ActionId.SendScriptEvent,
  {
    id: string;
    message: string;
  },
  void
>;
