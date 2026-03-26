import { describe, expect, it } from 'bun:test';
import type { Config } from '../src/types';
import { mergeConfig } from '../src/util/util';

const defaultConfig = {
  language: 'en_US',
  timezone_offset: 0,
  scripts_entry: '',
  bot: {
    command_role_id: [],
    send_ready: true,
    strip_color_prefix: false,
    panel_update_interval: 10000,
  },
  bridge: {
    disable_encryption: false,
  },
  translationOverrides: {},
  debug: false,
};

describe('mergeConfig', () => {
  it('merges shallow object properties and preserves defaults', () => {
    const parsedConfig: Config = {
      language: 'ja_JP',
      bot: {
        send_ready: false,
      },
      bridge: {
        disable_encryption: true,
      },
      translationOverrides: {},
      debug: true,
    };

    const merged = mergeConfig(defaultConfig, parsedConfig);

    expect(merged.language).toEqual('ja_JP');
    expect(merged.timezone_offset).toEqual(0);
    expect(merged.scripts_entry).toEqual('');

    expect(merged.bot).toEqual({
      command_role_id: [],
      send_ready: false,
      strip_color_prefix: false,
      panel_update_interval: 10000,
    });
    expect(merged.bridge).toEqual({
      disable_encryption: true,
    });
    expect(merged.debug).toBe(true);
    expect(merged.translationOverrides).toEqual({});
  });

  it('keeps defaults when parsed values are undefined', () => {
    const parsedConfig: Config = {
      bot: {},
      bridge: {},
      debug: undefined,
      translationOverrides: {},
    };

    const merged = mergeConfig(defaultConfig, parsedConfig);

    expect(merged).toEqual(defaultConfig);
  });
});
