import type { BaseAction } from '@script-bridge/protocol';
import type { ActionId, GameMode } from '../enums';
import type { UniqueId } from '../types';

export type GetGameModeAction = BaseAction<
  ActionId.GetGameMode,
  {
    playerUniqueId: UniqueId;
  },
  {
    gameMode: GameMode;
  }
>;
