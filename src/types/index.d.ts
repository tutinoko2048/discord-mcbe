declare module '_localizations.json' {
  const commands: { [commandName: string]: import('discord.js').LocalizationMap }
  export default commands;
}

declare module 'config.jsonc' {
  const config: IConfig;
  export default config;
}

export interface IConfig {
  /** Token of the bot */
  discord_token: string; 
  /** ID of the guild that use the bot */
  guild_id: string;
  /** ID of the channel that messages will be sent */
  channel_id: string;
  /** Port used to connect the bot */
  port: number;
  /** Language (File name in `lang` folder) */
  language: string; 
  /** Timezone used to display the time */
  timezone: string; 
  /** Role ids that are allowed to use commands to minecraft */
  command_role_id: string[];
  /** Whether to send messages when ready */
  ready_message: boolean; 
  /** Whether to delete § in messages sent from minecraft */
  delete_color_prefix: boolean;
  /** The interval to update StatusPanel */
  panel_update_interval: number;
  /** TN-AntiCheatからのメッセージを強調表示するか */
  styles_tnac: boolean;
  /** The entry file for custom scripts */
  scripts_entry?: string;
  /** The format version(mc) to be used for sending commands */
  command_version: string | number | number[];
  /** debug. */
  debug?: boolean;
}