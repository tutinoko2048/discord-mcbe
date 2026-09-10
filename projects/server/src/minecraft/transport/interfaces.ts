import type {
  DisconnectReason,
  RequestResult,
  ClientBoundRequestData,
  ClientBoundRequestType,
  ClientBoundResponseData,
} from '@discord-mcbe/shared';
import type { ConnectionInfo } from 'socket-be';

export interface ISession {
  readonly id: string;
  readonly worldName: string;
  readonly averagePing: number;
  readonly requestInfo: ConnectionInfo;

  disconnect(reason?: DisconnectReason): Promise<void>;
  destroy(): void;
  send<T extends ClientBoundRequestType>(
    type: T,
    data: ClientBoundRequestData<T>,
    timeout?: number,
  ): Promise<RequestResult<ClientBoundResponseData<T>>>;
}
