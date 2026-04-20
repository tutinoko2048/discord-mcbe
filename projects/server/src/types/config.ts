import { z } from 'zod';
import { getAvailableLanguages, getDefaultLocalizationKeys } from '../util/i18n';

const botSchema = z.object({
  reply_preview_max_length: z.number().int().positive()
    .describe('Maximum characters for replied content preview'),
  command_role_id: z.array(z.string())
    .describe('Role ids that are allowed to use commands to minecraft'),
  send_ready: z.boolean()
    .describe('Whether to send messages when ready'),
  strip_color_prefix: z.boolean()
    .describe('Whether to delete § in messages sent from minecraft'),
  panel_update_interval: z.number().int().positive()
    .describe('The interval to update StatusPanel'),
});

const bridgeSchema = z.object({
  disable_encryption: z.boolean()
    .describe('Disable encryption for WebSocket connection'),
});

const scriptSchema = z.object({
  entry: z.string()
    .describe('The entry file for custom scripts'),
});

export const configSchema = z.object({
  language: z.enum(getAvailableLanguages())
    .describe('Language'),
  timezone_offset: z.number().int()
    .describe('Timezone used to display the time'),
  bot: botSchema,
  bridge: bridgeSchema,
  script: scriptSchema,
  translationOverrides: z.partialRecord(z.enum(getDefaultLocalizationKeys()), z.string())
    .describe('Override specific translations with custom strings.'),
  debug: z.boolean()
    .describe('debug.'),
});

export type Config = z.infer<typeof configSchema>;
