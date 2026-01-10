import { EmbedBuilder } from 'discord.js';
import { _t, Logger } from '../util';
import {
  DiscordMessageEvent,
  DiscordReadyEvent,
  MinecraftMessageEvent,
  PlayerJoinEvent,
  PlayerLeaveEvent,
} from '../events';
import type { Application } from '../application';
import { Palette } from '../discord';

export class EventHandler {
  private readonly app: Application;

  private readonly logger: Logger;

  constructor(app: Application) {
    this.app = app;
    this.logger = new Logger('Event', this.app.config);

    this.logger.debug('Initialized');
  }

  start() {
    this.app.on('discordReady', this.onDiscordReady.bind(this));
    this.app.on('minecraftMessage', this.onMinecraftMessage.bind(this));
    this.app.on('discordMessage', this.onDiscordMessage.bind(this));
    this.app.on('playerJoin', this.onPlayerJoin.bind(this));
    this.app.on('playerLeave', this.onPlayerLeave.bind(this));
  }

  private async onDiscordReady(_event: DiscordReadyEvent) {
    const embed = new EmbedBuilder()
      .setColor(Palette.Discord)
      .setTimestamp()
      .setDescription(_t('discord.ready'))
      .setFooter({ text: `discord-mcbe v${this.app.version}` });

    try {
      await this.app.bot.sendMessage({ embeds: [embed] }).catch((e) => this.logger.error(e));
    } catch (error) {
      this.logger.error(error);
    }
  }

  private async onMinecraftMessage(event: MinecraftMessageEvent) {
    const { world, sender, message } = event;

    this.logger.info(_t('console.chat', world.name, sender.name, message));

    try {
      if (this.app.minecraft.getWorlds().length > 2) {
        await this.app.bot.sendMessage(_t('discord.chat.multipleWorlds', world.name, sender.name, message));
      } else {
        await this.app.bot.sendMessage(_t('discord.chat', sender.name, message));
      }
    } catch (error) {
      this.logger.error(error);
    }
  }

  private async onDiscordMessage(event: DiscordMessageEvent) {
    const { message } = event;

    const senderName = message.member?.displayName ?? message.author.username;
    const content = message.cleanContent;

    if (content.length > 0) {
      this.logger.info(_t('console.message', message.guild.name, senderName, message.cleanContent));

      for (const world of this.app.minecraft.getWorlds()) {
        world.sendMessage(_t('minecraft.message', senderName, message.cleanContent)).catch((error) => {
          this.logger.error(`Failed to send message to Minecraft world '${world.name}':`, error);
        });
      }
    }

    if (message.attachments.size > 0) {
      this.logger.info(
        _t('console.withAttachments', message.guild.name, senderName, message.attachments.size)
      );

      for (const world of this.app.minecraft.getWorlds()) {
        world
          .sendMessage(_t('minecraft.withAttachments', senderName, message.attachments.size))
          .catch((error) => {
            this.logger.error(`Failed to send message to Minecraft world '${world.name}':`, error);
          });
      }
    }
  }

  private async onPlayerJoin(event: PlayerJoinEvent) {
    const { world, player, app } = event;

    this.logger.info(_t('console.join', world.name, player.name));

    const embed = new EmbedBuilder();
    embed.setColor(0x66bb6a);
    embed.setDescription(_t('discord.join', player.name));
    if (app.minecraft.getWorlds().length > 2) embed.setFooter({ text: world.name });

    try {
      await this.app.bot.sendMessage({ embeds: [embed] });
    } catch (error) {
      this.logger.error(error);
    }
  }

  private async onPlayerLeave(event: PlayerLeaveEvent) {
    const { world, player, app } = event;

    this.logger.info(_t('console.leave', world.name, player.name));

    const embed = new EmbedBuilder();
    embed.setColor(0xef5350);
    embed.setDescription(_t('discord.leave', player.name));
    if (app.minecraft.getWorlds().length > 2) embed.setFooter({ text: world.name });

    try {
      await this.app.bot.sendMessage({ embeds: [embed] });
    } catch (error) {
      this.logger.error(error);
    }
  }
}
