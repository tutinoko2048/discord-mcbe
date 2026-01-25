import { z } from 'zod';

export const configSchema = z.object({
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
    .describe('debug.'),
  disable_encryption: z.boolean()
    .optional()
    .describe('Disable encryption for WebSocket connection'),
});

export type Config = z.infer<typeof configSchema>;
