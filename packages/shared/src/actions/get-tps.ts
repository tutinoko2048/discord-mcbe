import type { BaseAction } from '@script-bridge/protocol';
import type { ActionId } from '../enums';

export type GetTPSAction = BaseAction<
  ActionId.GetTPS,
  {},
  {
    tps: number;
  }
>;
