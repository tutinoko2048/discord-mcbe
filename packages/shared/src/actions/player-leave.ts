import type { BaseAction } from '@script-bridge/protocol';
import type { ActionId } from '../enums';
import { UniqueId } from '../types';

export type PlayerLeaveAction = BaseAction<ActionId.PlayerLeave, { playerUniqueId: UniqueId }, void>;
