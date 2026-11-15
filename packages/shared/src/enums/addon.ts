/** Features an add-on can request when it registers with discord-mcbe. */
export enum AddonFeature {
  /** The add-on handles Minecraft chat itself and reports it to discord-mcbe. */
  MinecraftChat = 'minecraft_chat',
}

/** MCBE-IPC channels discord-mcbe exposes to other add-ons. */
export enum AddonChannel {
  /** invoke: whether discord-mcbe is connected to its server. */
  Ping = 'dmc:ping',
  /** invoke: registers an add-on and the features it uses. */
  Register = 'dmc:register',
  /** send (add-on → discord-mcbe): reports a chat message handled by the add-on. */
  ChatSend = 'dmc:on_chat_send',
  /** send (add-on → discord-mcbe): sends a message to Discord. */
  SendMessage = 'dmc:send_message',
  /** send (discord-mcbe → add-ons): the connection to the server has started. */
  Connect = 'dmc:connect',
  /** send (discord-mcbe → add-ons): the connection to the server has ended. */
  Disconnect = 'dmc:disconnect',
}
