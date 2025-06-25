import type { BaseAction } from '@script-bridge/protocol';
import type { ActionId, GameMode } from '../enums';

export type GetGameModeAction = BaseAction<
  ActionId.GetGameMode,
  {
    playerUniqueId: string;
  },
  {
    gameMode: GameMode;
  }
>;
