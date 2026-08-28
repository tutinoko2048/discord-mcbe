import type { BaseAction } from '../protocol';
import type { ActionId } from '../enums';
import type { UniqueId } from '../types';

export type PlayerLeaveAction = BaseAction<ActionId.PlayerLeave, { playerUniqueId: UniqueId }, void>;
