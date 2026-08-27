import z from 'zod';

export const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1).describe('Token of the bot'),
  GUILD_ID: z.string().min(1).describe('ID of the guild that use the bot'),
  CHANNEL_ID: z.string().min(1).describe('ID of the channel that messages will be sent'),
  SOCKET_PORT: z.coerce.number().int().positive().optional().describe('Port used for websocket connection'),
  BRIDGE_PORT: z.coerce.number().int().positive().optional().describe('Port used for BDS connection'),
  BRIDGE_TRANSPORT: z
    .enum(['websocket', 'polling'])
    .optional()
    .describe('Transport used for the BDS connection'),
});

export type Env = z.infer<typeof envSchema>;
