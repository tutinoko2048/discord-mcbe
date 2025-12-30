import type { BaseAction } from '@script-bridge/protocol';
import type { ActionId, GameMode } from '../enums';
import type { UniqueId } from '../types';

export type SetGameModeAction = BaseAction<
  ActionId.SetGameMode,
  {
    playerUniqueId: UniqueId;
    gameMode: GameMode;
  },
  void
>;
