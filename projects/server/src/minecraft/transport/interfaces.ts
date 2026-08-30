import type {
  DisconnectReason,
  RequestResult,
  ClientBoundRequestData,
  ClientBoundRequestType,
  ClientBoundResponseData,
} from '@discord-mcbe/shared';

export interface ISession {
  readonly id: string;
  clientId: string;
  averagePing: number;

  disconnect(reason?: DisconnectReason): Promise<void>;
  destroy(): void;
  send<T extends ClientBoundRequestType>(
    type: T,
    data: ClientBoundRequestData<T>,
    timeout?: number,
  ): Promise<RequestResult<ClientBoundResponseData<T>>>;
}
