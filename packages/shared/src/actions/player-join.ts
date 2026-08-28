import type { BaseAction } from '../protocol';
import type { ActionId } from '../enums';
import type { PlayerDescriptor } from '../types';

export type PlayerJoinAction = BaseAction<ActionId.PlayerJoin, { player: PlayerDescriptor }, void>;
