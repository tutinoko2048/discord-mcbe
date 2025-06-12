import type { BaseAction } from '@script-bridge/protocol'
import type { ActionId } from '../enums';

export type RunCommandAction = BaseAction<
  ActionId.RunCommand,
  { command: string },
  { successCount: number }
>;