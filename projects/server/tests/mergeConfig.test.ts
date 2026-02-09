import { describe, expect, it } from 'bun:test';
import type { Config } from '../src/types';
import { mergeConfig } from '../src/util/util';

const defaultConfig = {
  app: {
    language: 'en_US',
    timezone_offset: 0,
    scripts_entry: '',
  },
  bot: {
    command_role_id: [],
    send_ready: true,
    strip_color_prefix: false,
    panel_update_interval: 10000,
  },
  bridge: {
    disable_encryption: false,
  },
  debug: false,
};

describe('mergeConfig', () => {
  it('merges shallow object properties and preserves defaults', () => {
    const parsedConfig: Config = {
      app: {
        language: 'ja_JP',
      },
      bot: {
        send_ready: false,
      },
      bridge: {
        disable_encryption: true,
      },
      debug: true,
    };

    const merged = mergeConfig(defaultConfig, parsedConfig);

    expect(merged.app).toEqual({
      language: 'ja_JP',
      timezone_offset: 0,
      scripts_entry: '',
    });
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
  });

  it('keeps defaults when parsed values are undefined', () => {
    const parsedConfig: Config = {
      app: {},
      bot: {},
      bridge: {},
      debug: undefined,
    };

    const merged = mergeConfig(defaultConfig, parsedConfig);

    expect(merged).toEqual(defaultConfig);
  });
});
