import { Logger } from '../util';
import type { Application } from '../application';
import { DiscordMessageEvent, MinecraftMessageEvent } from '../events';

export class MessageSyncHandler {
  private readonly app: Application;

  private readonly logger: Logger;

  constructor(app: Application) {
    this.app = app;
    this.logger = new Logger('MessageSync', this.app.config);

    this.app.on('minecraftMessage', this.onMinecraftMessage.bind(this));
    this.app.on('discordMessage', this.onDiscordMessage.bind(this));

    this.logger.debug('Initialized');
  }

  private async onMinecraftMessage(event: MinecraftMessageEvent) {
    const { world, sender, message } = event;

    this.logger.info(`[${world.name}] <${sender.name}> ${message}`);

    try {
      await this.app.bot.sendMessage(`[${world.name}] <${sender.name}> ${message}`);
    } catch (error) {
      this.logger.error('Failed to send message to Discord:', error);
    }
  }

  private async onDiscordMessage(event: DiscordMessageEvent) {
    const { message } = event;

    const senderName = message.member?.displayName ?? message.author.username;

    this.logger.info(`[Discord | ${message.guild.name}] <${senderName}> ${message.cleanContent}`);

    for (const world of this.app.minecraft.getWorlds()) {
      world.sendMessage(`§9[Discord]§r <${senderName}> ${message.cleanContent}`).catch((error) => {
        this.logger.error(`Failed to send message to Minecraft world "${world.name}":`, error);
      });
    }
  }
}
