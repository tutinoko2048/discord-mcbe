import type { Config } from '../types';

export const defaultConfig: Config = {
  config_version: 1,
  language: 'ja',
  timezone_offset: 0,
  bot: {
    show_death_messages: true,
    reply_preview_max_length: 9,
    strip_color_prefix: true,
    minecraft_chat_avatar_url: undefined,
    panel_update_interval: 10000,
    discord_message_filter: [],
  },
  bridge: {
    disable_encryption: false,
  },
  script: {
    entry: 'scripts/main.js',
  },
  translationOverrides: {},
  debug: false,
};
