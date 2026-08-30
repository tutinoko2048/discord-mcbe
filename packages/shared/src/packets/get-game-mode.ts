import * as v from 'valibot';
import { ActionId, GameMode } from '../enums';
import { requestPacket, UniqueIdSchema } from './common';

export const GetGameModePacket = requestPacket(
  ActionId.GetGameMode,
  v.strictObject({ playerUniqueId: UniqueIdSchema }),
  v.strictObject({ gameMode: v.enum(GameMode) }),
);
