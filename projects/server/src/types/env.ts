import z from 'zod';

export const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1).describe('Token of the bot'),
  GUILD_ID: z.string().min(1).describe('ID of the guild that use the bot'),
  CHANNEL_ID: z.string().min(1).describe('ID of the channel that messages will be sent'),
  DISCORD_WEBHOOK_URL: z.url().optional().describe('Webhook URL used only for Minecraft chat messages'),
  SOCKET_PORT: z.coerce.number().int().positive().optional().describe('Port used for websocket connection'),
  BRIDGE_PORT: z.coerce.number().int().positive().optional().describe('Port used for BDS connection'),
});

export type Env = z.infer<typeof envSchema>;
