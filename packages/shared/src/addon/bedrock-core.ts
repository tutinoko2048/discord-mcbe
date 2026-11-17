import type { AddonChatSend, AddonRegisterRequest, AddonRegisterResponse, AddonSendMessage } from './common';

// What add-ons use to reach discord-mcbe over `@bedrock-core/sync`. Exported as `AddonSync`.

/** Node ID of discord-mcbe. Add-ons address requests to it and listen to its events and state. */
export const NODE_ID = 'discord-mcbe';

/** RPC methods discord-mcbe answers. */
export enum Method {
  /** Registers the calling add-on and the features it uses. */
  Register = 'register',
  /** Reports a chat message handled by the calling add-on. */
  ChatSend = 'chatSend',
  /** Sends a message to Discord. */
  SendMessage = 'sendMessage',
}

/** Events discord-mcbe emits under the {@link NODE_ID} namespace. */
export enum Event {
  /** The connection to the server has started. */
  Connect = 'connect',
  /** The connection to the server has ended. */
  Disconnect = 'disconnect',
  /** A chat message relayed from Discord, for the add-on to display. */
  DiscordChat = 'discordChat',
}

/** State keys discord-mcbe publishes under the {@link NODE_ID} namespace. */
export enum StateKey {
  /** boolean: whether discord-mcbe is connected to its server. */
  Connected = 'connected',
}

/**
 * Requests discord-mcbe answers, named after {@link Method}.
 * Pass it to `sync.rpc.typed<AddonSync.Rpc>(AddonSync.NODE_ID)` for a typed client.
 */
export interface Rpc {
  register(params: AddonRegisterRequest): AddonRegisterResponse;
  /** Resolves to whether the chat was passed on to the server. */
  chatSend(params: AddonChatSend): boolean;
  /** Resolves to whether the message was passed on to the server. */
  sendMessage(params: AddonSendMessage): boolean;
}
