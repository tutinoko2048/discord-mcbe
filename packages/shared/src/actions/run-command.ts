import type { BaseAction } from '../protocol';
import type { ActionId } from '../enums';

type RunCommandResponse =
  | {
      error: true;
      message: string;
    }
  | {
      error: false;
      successCount: number;
    };

export type RunCommandAction = BaseAction<ActionId.RunCommand, { command: string }, RunCommandResponse>;
