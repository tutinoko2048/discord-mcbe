import { z } from 'zod';

export const configSchema = z.object({
  discord_token: z.string()
    .describe('Token of the bot'),
  guild_id: z.string()
    .describe('ID of the guild that use the bot'),
  channel_id: z.string()
    .describe('ID of the channel that messages will be sent'),
  port: z.number().int().positive()
    .optional()
    .describe('Port used to connect the bot'),
  language: z.string()
    .optional()
    .describe('Language (File name in `lang` folder)'),
  timezoneOffset: z.number().int()
    .optional()
    .describe('Timezone used to display the time'),
  command_role_id: z.array(z.string())
    .optional()
    .describe('Role ids that are allowed to use commands to minecraft'),
  ready_message: z.boolean()
    .optional()
    .describe('Whether to send messages when ready'),
  strip_color_prefix: z.boolean()
    .optional()
    .describe('Whether to delete § in messages sent from minecraft'),
  panel_update_interval: z.number().int().positive()
    .optional()
    .describe('The interval to update StatusPanel'),
  styles_tnac: z.boolean()
    .optional()
    .describe('TN-AntiCheatからのメッセージを強調表示するか'),
  scripts_entry: z.string()
    .optional()
    .describe('The entry file for custom scripts'),
  command_version: z.union([
    z.string(),
    z.number(),
    z.tuple([z.number(), z.number(), z.number()])
  ]).optional()
    .describe('The format version(mc) to be used for sending commands'),
  debug: z.boolean()
    .optional()
    .describe('debug.')
});

export type Config = z.infer<typeof configSchema>;
