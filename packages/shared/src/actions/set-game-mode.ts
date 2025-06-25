import type { BaseAction } from '@script-bridge/protocol';
import type { ActionId, GameMode } from '../enums';

export type SetGameModeAction = BaseAction<
  ActionId.SetGameMode,
  {
    playerUniqueId: string;
    gameMode: GameMode;
  },
  void
>;
