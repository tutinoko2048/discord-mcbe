import * as v from 'valibot';
import { ActionId, GameMode } from '../enums';
import { requestPacket, UniqueIdSchema } from './common';

export const SetGameModePacket = requestPacket(
  ActionId.SetGameMode,
  v.strictObject({
    playerUniqueId: UniqueIdSchema,
    gameMode: v.enum(GameMode),
  }),
  v.null(),
);
