import { type BaseAction } from '@discord-mcbe/shared';
import type { ISession } from './interfaces';

export type ClientAction<A extends BaseAction> = {
  readonly data: A['request'];
  readonly session: ISession;
  readonly respond: (data: A['response']) => void;
};

export type ClientActionHandler<T extends BaseAction> = (action: ClientAction<T>) => Promise<void> | void;
