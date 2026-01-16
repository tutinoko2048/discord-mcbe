import type { ActionId } from '@discord-mcbe/shared';
import type { ActionHandler } from '@script-bridge/client';
import type { BaseAction, DisconnectReason } from '@script-bridge/protocol';

type Listener<T> = (data: T) => void;

export type IResponse<T = unknown> =
  | {
      error?: false;
      data: T;
    }
  | {
      error: true;
      message: string;
    };

export interface IBridgeClient {
  isConnected: boolean;

  send<T extends BaseAction = BaseAction>(
    channelId: ActionId,
    data?: T['request'],
  ): Promise<IResponse<T['response']>>;

  registerHandler<A extends BaseAction = BaseAction>(channelId: A['id'], handler: ActionHandler<A>): void;

  on(event: 'connect', listener: Listener<{ sessionId: string }>): void;
  on(event: 'disconnect', listener: Listener<{ reason: DisconnectReason }>): void;
}
