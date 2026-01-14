import { EmbedBuilder } from 'discord.js';
import { _t, Logger } from '../util';
import {
  DiscordMessageEvent,
  DiscordReadyEvent,
  MinecraftMessageEvent,
  PlayerJoinEvent,
  PlayerLeaveEvent,
  WorldConnectEvent,
  WorldDisconnectEvent,
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
    this.app.on('worldConnect', this.onWorldConnect.bind(this));
    this.app.on('worldDisconnect', this.onWorldDisconnect.bind(this));
    this.app.on('minecraftMessage', this.onMinecraftMessage.bind(this));
    this.app.on('discordMessage', this.onDiscordMessage.bind(this));
    this.app.on('playerJoin', this.onPlayerJoin.bind(this));
    this.app.on('playerLeave', this.onPlayerLeave.bind(this));
  }

  private async onDiscordReady(_event: DiscordReadyEvent) {
    const embed = new EmbedBuilder();
    embed.setColor(Palette.Discord);
    embed.setTimestamp();
    embed.setDescription(_t('discord.ready'));
    embed.setFooter({ text: `discord-mcbe v${this.app.version}` });

    try {
      await this.app.bot.sendMessage({ embeds: [embed] }).catch((e) => this.logger.error(e));
    } catch (error) {
      this.logger.error(error);
    }
  }

  private async onWorldConnect(event: WorldConnectEvent) {
    const { world } = event;

    this.logger.info(_t('console.connect', world.name));

    const embed = new EmbedBuilder();
    embed.setColor(Palette.Connect);
    embed.setDescription(_t('discord.connect'));
    embed.setFooter({ text: world.name });

    const channelName = `#${this.app.bot.getMainChannel().name}`;

    try {
      await this.app.bot.sendMessage({ embeds: [embed] });
      await world.sendMessage(_t('minecraft.connect', channelName));
    } catch (error) {
      this.logger.error(error);
    }
  }

  private async onWorldDisconnect(event: WorldDisconnectEvent) {
    const { world } = event;

    this.logger.info(_t('console.disconnect', world.name));

    const embed = new EmbedBuilder();
    embed.setColor(Palette.Disconnect);
    embed.setDescription(_t('discord.disconnect'));
    embed.setFooter({ text: world.name });

    try {
      await this.app.bot.sendMessage({ embeds: [embed] });
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
    const repliedUser = message.mentions.repliedUser;
    const repliedName = repliedUser
      ? (message.guild.members.cache.get(repliedUser.id)?.displayName ?? repliedUser.username)
      : undefined;

    if (content.length > 0) {
      if (repliedName) {
        this.logger.info(_t('console.reply', message.guild.name, senderName, repliedName, content));

        await this.app.minecraft.broadcastMessage(_t('minecraft.reply', senderName, repliedName, content));
      } else {
        this.logger.info(_t('console.message', message.guild.name, senderName, content));
        await this.app.minecraft.broadcastMessage(_t('minecraft.message', senderName, content));
      }
    }

    if (message.attachments.size > 0) {
      if (repliedName) {
        this.logger.info(
          _t(
            'console.reply.withAttachments',
            message.guild.name,
            senderName,
            repliedName,
            message.attachments.size,
          ),
        );

        await this.app.minecraft.broadcastMessage(
          _t('minecraft.reply.withAttachments', senderName, repliedName, message.attachments.size),
        );
      } else {
        this.logger.info(
          _t('console.message.withAttachments', message.guild.name, senderName, message.attachments.size),
        );
        await this.app.minecraft.broadcastMessage(
          _t('minecraft.message.withAttachments', senderName, message.attachments.size),
        );
      }
    }
  }

  private async onPlayerJoin(event: PlayerJoinEvent) {
    const { world, player, app } = event;

    this.logger.info(_t('console.join', world.name, player.name));

    const embed = new EmbedBuilder();
    embed.setColor(Palette.Join);
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
    embed.setColor(Palette.Leave);
    embed.setDescription(_t('discord.leave', player.name));
    if (app.minecraft.getWorlds().length > 2) embed.setFooter({ text: world.name });

    try {
      await this.app.bot.sendMessage({ embeds: [embed] });
    } catch (error) {
      this.logger.error(error);
    }
  }
}
