import type { BaseAction } from '@script-bridge/protocol'
import type { ActionId } from '../enums';
import type { PlayerDescriptor } from '../types';

export type PlayerJoinAction = BaseAction<
  ActionId.PlayerJoin,
  { player: PlayerDescriptor },
  void
>;