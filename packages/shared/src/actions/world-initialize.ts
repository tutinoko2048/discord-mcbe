import type { BaseAction } from '@script-bridge/protocol';
import type { ActionId } from '../enums';
import type { PlayerDescriptor } from '../types';

export type WorldInitializeAction = BaseAction<
  ActionId.WorldInitialize,
  {
    players: PlayerDescriptor[];
  },
  void
>;
