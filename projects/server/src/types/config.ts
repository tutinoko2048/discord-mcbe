import { z } from 'zod';
import { getAvailableLanguages, getDefaultLocalizationKeys } from '../util/i18n';

const lengthFilterSchema = z
  .object({
    on_fail: z
      .enum(['cancel', 'shorten'])
      .describe('Action to take when content exceeds max length or lines'),
    max_content_length: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Maximum character length of the content'),
    max_content_lines: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Maximum number of lines in the content'),
  })
  .describe('LengthFilter');

const regexFilterSchema = z
  .object({
    on_fail: z.enum(['cancel', 'replace']).describe('Action to take when content matches the regex pattern'),
    ignore_pattern: z.string().describe('Regular expression for content to ignore certain content'),
  })
  .describe('RegexFilter');

const messageFilterSchema = z.union([lengthFilterSchema, regexFilterSchema]);
export type MessageFilter = z.infer<typeof messageFilterSchema>;

const avatarUrlTemplateSchema = z
  .string()
  .refine(
    (value) => URL.canParse(value.replaceAll('{name}', 'player').replaceAll('{pfid}', 'playfab-id')),
    'Must be a valid URL template using {name} and {pfid} placeholders.',
  );

const botSchema = z.object({
  show_death_messages: z.boolean().describe('Whether to send Minecraft player death messages to Discord'),
  reply_preview_max_length: z
    .number()
    .int()
    .positive()
    .describe('Maximum characters for replied content preview'),
  strip_color_prefix: z.boolean().describe('Whether to delete § in messages sent from minecraft'),
  minecraft_chat_avatar_url: avatarUrlTemplateSchema
    .optional()
    .describe('Optional avatar URL template for Minecraft chat webhooks. Supports {name} and {pfid}.'),
  panel_update_interval: z.number().int().positive().describe('The interval to update StatusPanel'),
  discord_message_filter: z
    .union([messageFilterSchema, z.array(messageFilterSchema)])
    .describe(
      'Filters to apply to messages sent from Discord to Minecraft. Can be a single filter or an array of filters to apply in order.',
    ),
});

const bridgeSchema = z.object({
  disable_encryption: z.boolean().describe('Disable encryption for WebSocket connection'),
});

const scriptSchema = z.object({
  entry: z.string().describe('The entry file for custom scripts'),
});

export const configSchema = z.object({
  config_version: z
    .number()
    .int()
    .positive()
    .describe('The version of the config file, used for internal migration.'),
  language: z.enum(getAvailableLanguages()).describe('Language'),
  timezone_offset: z.number().int().describe('Timezone used to display the time'),
  bot: botSchema,
  bridge: bridgeSchema,
  script: scriptSchema,
  translationOverrides: z
    .partialRecord(z.enum(getDefaultLocalizationKeys()), z.string())
    .describe('Override specific translations with custom strings.'),
  debug: z.boolean().describe('debug.'),
});

export type Config = z.infer<typeof configSchema>;
