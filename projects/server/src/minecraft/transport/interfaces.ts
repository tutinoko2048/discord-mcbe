import type {
  BaseAction,
  BdsWebSocketResponse,
  ClientResponse,
  DisconnectReason,
} from '@discord-mcbe/shared';

type IClientResponse<T> = ClientResponse<T> | (BdsWebSocketResponse<T> & { sessionId: string });

export interface ISession {
  readonly id: string;
  clientId: string;
  averagePing: number;

  disconnect(reason?: DisconnectReason): Promise<void>;
  destroy(): void;
  send<A extends BaseAction = BaseAction>(
    channelId: A['id'],
    data?: A['request'],
    timeout?: number,
  ): Promise<IClientResponse<A['response']>>;
}
