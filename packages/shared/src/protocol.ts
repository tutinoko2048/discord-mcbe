/** Wire values are explicit to keep existing add-ons compatible. */
export enum PayloadType {
  Request = 0,
  Response = 1,
}

export enum DisconnectReason {
  Disconnect = 0,
  OutdatedServer = 1,
  OutdatedClient = 2,
  ConnectionLost = 3,
}

export enum ResponseErrorReason {
  Abort = 1,
  Timeout = 2,
  InvalidSession = 3,
  UnhandledRequest = 4,
  InternalError = 5,
  InvalidPayload = 6,
}

export enum InternalAction {
  Connect = '__internal__:connect',
  Disconnect = '__internal__:disconnect',
  Ping = '__internal__:ping',
}

export interface BaseAction<ID extends string = string, Request = unknown, Response = unknown> {
  id: ID;
  request: Request;
  response: Response;
}

export type ConnectAction = BaseAction<
  InternalAction.Connect,
  { clientId: string; protocolVersion: number },
  { sessionId: string }
>;

export namespace InternalActions {
  export type Connect = ConnectAction;
  export type Disconnect = BaseAction<InternalAction.Disconnect, { reason: DisconnectReason }, void>;
  export type Ping = BaseAction<InternalAction.Ping, { sentAt: number }, { receivedAt: number }>;
}

/** An action delivered to an add-on by either WebSocket bridge. */
export type ServerAction<A extends BaseAction> = {
  readonly data: A['request'];
  readonly respond: (data: A['response']) => void;
};

export type ActionHandler<A extends BaseAction> = (action: ServerAction<A>) => PromiseLike<void> | void;

export class NamespaceRequiredError extends Error {
  constructor(readonly channelId: string) {
    super(`Channel ID "${channelId}" must include a namespace`);
  }
}
