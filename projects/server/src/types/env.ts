import z from 'zod';

export const envSchema = z.object({
  DISCORD_TOKEN: z.string()
    .describe('Token of the bot'),
  GUILD_ID: z.string()
    .describe('ID of the guild that use the bot'),
  CHANNEL_ID: z.string()
    .describe('ID of the channel that messages will be sent'),
  SOCKET_PORT: z.number().int().positive()
    .optional()
    .describe('Port used for websocket connection'),
  BRIDGE_PORT: z.number().int().positive()
    .optional()
    .describe('Port used for ScriptBridge(BDS) connection'),
})

export type Env = z.infer<typeof envSchema>;
