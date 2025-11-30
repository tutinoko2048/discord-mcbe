import { ClientResponse as SocketClientResponse } from '@discord-mcbe/shared';
import { BaseAction, ClientResponse as ScriptClientResponse, DisconnectReason } from '@script-bridge/protocol';

type IClientResponse<T> = SocketClientResponse<T> | ScriptClientResponse<T>;

export interface ISession {
  readonly id: string;
  clientId: string;
  averagePing: number;

  disconnect(reason?: DisconnectReason): Promise<void>;
  destroy(): void;
  send<A extends BaseAction = BaseAction>(channelId: A['id'], data?: A['request'], timeout?: number): Promise<IClientResponse<A['response']>>;
}
