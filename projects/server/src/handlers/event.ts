import { EmbedBuilder } from 'discord.js';
import { _t, Logger, applyMessageFilters, FILTER_MASK, SHORTEN_SUFFIX } from '../util';
import { Palette } from '../discord';
import type {
  DiscordMessageEvent,
  DiscordReadyEvent,
  MinecraftMessageEvent,
  PlayerJoinEvent,
  PlayerLeaveEvent,
  WorldConnectEvent,
  WorldDisconnectEvent,
} from '../events';
import type { Application } from '../application';

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
    const { world, sender, message: rawMessage } = event;

    let message = rawMessage;
    if (this.app.config.bot.strip_color_prefix) {
      message = message.replace(/§./g, '');
    }

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

    let content = message.cleanContent;
    const rawFilters = this.app.config.bot.discord_message_filter;
    const filters = Array.isArray(rawFilters) ? rawFilters : [rawFilters];
    const contentResult = applyMessageFilters(content, filters);
    if (contentResult.action === 'cancel') return;
    if (contentResult.action === 'update') content = contentResult.updatedContent;

    const repliedUser = message.mentions.repliedUser;
    const repliedName = repliedUser
      ? (message.guild.members.cache.get(repliedUser.id)?.displayName ?? repliedUser.username)
      : undefined;
    let repliedContent: string = '-';
    if (message.reference?.messageId) {
      const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);

      repliedContent = repliedMessage.cleanContent;
      const replyResult = applyMessageFilters(repliedMessage.cleanContent, filters);
      if (replyResult.action === 'cancel') {
        repliedContent = FILTER_MASK; // Mask the replied content if it is canceled by filters
      } else if (replyResult.action === 'update') {
        repliedContent = replyResult.updatedContent;
      }

      const maxLength = this.app.config.bot.reply_preview_max_length;
      if (repliedContent.length > maxLength) {
        repliedContent = repliedContent.slice(0, maxLength) + SHORTEN_SUFFIX;
      }
    }

    if (content.length > 0) {
      if (repliedName) {
        this.logger.info(
          _t('console.reply', message.guild.name, senderName, repliedName, repliedContent, content),
        );

        await this.app.minecraft.broadcastMessage(
          _t('minecraft.reply', senderName, repliedName, repliedContent, content),
        );
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
            repliedContent,
            message.attachments.size,
          ),
        );

        await this.app.minecraft.broadcastMessage(
          _t(
            'minecraft.reply.withAttachments',
            senderName,
            repliedName,
            repliedContent,
            message.attachments.size,
          ),
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
