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
  InternalError = 4,
  InvalidPayload = 5,
}

export enum InternalAction {
  Connect = '__internal__:connect',
  Disconnect = '__internal__:disconnect',
  Ping = '__internal__:ping',
}
