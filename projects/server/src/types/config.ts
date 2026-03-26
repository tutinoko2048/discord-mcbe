import { z } from 'zod';
import { getAvailableLanguages, getDefaultLocalizationKeys } from '../util/i18n';

const botSchema = z.object({
  command_role_id: z.array(z.string())
    .optional()
    .describe('Role ids that are allowed to use commands to minecraft'),
  send_ready: z.boolean()
    .optional()
    .describe('Whether to send messages when ready'),
  strip_color_prefix: z.boolean()
    .optional()
    .describe('Whether to delete § in messages sent from minecraft'),
  panel_update_interval: z.number().int().positive()
    .optional()
    .describe('The interval to update StatusPanel'),
});

const bridgeSchema = z.object({
  disable_encryption: z.boolean()
    .optional()
    .describe('Disable encryption for WebSocket connection'),
});

export const configSchema = z.object({
  language: z.enum(getAvailableLanguages())
    .optional()
    .describe('Language'),
  timezone_offset: z.number().int()
    .optional()
    .describe('Timezone used to display the time'),
  scripts_entry: z.string()
    .optional()
    .describe('The entry file for custom scripts'),
  bot: botSchema,
  bridge: bridgeSchema,
  translationOverrides: z.partialRecord(z.enum(getDefaultLocalizationKeys()), z.string())
    .describe('Override specific translations with custom strings.'),
  debug: z.boolean()
    .optional()
    .describe('debug.'),
});

export type Config = z.infer<typeof configSchema>;
