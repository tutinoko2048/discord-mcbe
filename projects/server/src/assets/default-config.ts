import type { Config } from '../types';

// Keep optional keys here so config merging accepts user-provided values
export const defaultConfig: Config = {
  config_version: 1,
  check_for_updates: true,
  language: 'ja',
  timezone_offset: undefined,
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
  translation_overrides: {},
  debug: false,
};
