import { EmbedBuilder } from 'discord.js';
import {
  _t,
  Logger,
  applyMessageFilters,
  FILTER_MASK,
  SHORTEN_SUFFIX,
  formatChatDisplay,
  formatDeathMessage,
} from '../util';
import { Palette } from '../discord';
import type {
  DiscordMessageEvent,
  DiscordReadyEvent,
  MinecraftMessageEvent,
  PlayerDieEvent,
  PlayerJoinEvent,
  PlayerLeaveEvent,
  WorldConnectEvent,
  WorldDisconnectEvent,
} from '../events';
import type { Application } from '../application';
import type { GuildMember, User } from 'discord.js';
import type { DiscordChatMember, DiscordChatMessage, DiscordChatUser } from '@discord-mcbe/shared';

function toChatUser(user: User): DiscordChatUser {
  return { id: user.id, username: user.username, displayName: user.displayName, bot: user.bot };
}

function toChatMember(member: GuildMember | null): DiscordChatMember | null {
  if (!member) return null;
  const roles = [...member.roles.cache.values()]
    .filter((role) => role.id !== member.guild.id) // `@everyone` shares its ID with the server
    .sort((a, b) => b.position - a.position)
    .map((role) => ({ id: role.id, name: role.name }));
  return { displayName: member.displayName, roles };
}

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
    if (this.app.config.bot.show_death_messages) this.app.on('playerDie', this.onPlayerDie.bind(this));
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
    const { world, sender } = event;
    const {
      senderName: displayName,
      message,
      name,
      namePrefix,
      nameSuffix,
    } = formatChatDisplay({
      senderName: sender.name,
      message: event.message,
      formatting: event.formatting,
      stripColor: this.app.config.bot.strip_color_prefix,
    });

    this.logger.info(_t('console.chat', world.name, displayName, message, name, namePrefix, nameSuffix));

    try {
      const worldCount = this.app.minecraft.getWorlds().length;
      if (this.app.env.DISCORD_WEBHOOK_URL) {
        await this.app.bot.sendMinecraftChat({
          worldName: world.name,
          worldCount,
          senderName: sender.name,
          displayName,
          pfid: sender.pfid,
          content: message,
          avatarUrlTemplate: this.app.config.bot.minecraft_chat_avatar_url,
        });
      } else if (worldCount >= 2) {
        await this.app.bot.sendMessage(
          _t('discord.chat.multipleWorlds', world.name, displayName, message, name, namePrefix, nameSuffix),
        );
      } else {
        await this.app.bot.sendMessage(
          _t('discord.chat', displayName, message, name, namePrefix, nameSuffix),
        );
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
    let referencedMessage: DiscordChatMessage['referencedMessage'] = null;
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

      if (repliedUser) {
        referencedMessage = {
          id: repliedMessage.id,
          content: repliedContent,
          author: toChatUser(repliedMessage.author),
          member: toChatMember(
            repliedMessage.member ?? message.guild.members.cache.get(repliedMessage.author.id) ?? null,
          ),
        };
      }
    }

    // One Discord message is relayed once, so an add-on never sees the same `message` twice.
    const lines: string[] = [];

    if (content.length > 0) {
      if (repliedName) {
        this.logger.info(
          _t('console.reply', message.guild.name, senderName, repliedName, repliedContent, content),
        );

        lines.push(_t('minecraft.reply', senderName, repliedName, repliedContent, content));
      } else {
        this.logger.info(_t('console.message', message.guild.name, senderName, content));
        lines.push(_t('minecraft.message', senderName, content));
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

        lines.push(
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
        lines.push(_t('minecraft.message.withAttachments', senderName, message.attachments.size));
      }
    }

    if (lines.length === 0) return;

    await this.app.minecraft.broadcastDiscordChat({
      text: lines.join('\n'),
      message: {
        id: message.id,
        channelId: message.channelId,
        content,
        author: toChatUser(message.author),
        member: toChatMember(message.member),
        attachments: message.attachments.map((attachment) => ({
          name: attachment.name,
          contentType: attachment.contentType,
        })),
        mentions: {
          users: message.mentions.users.map(toChatUser),
          roles: message.mentions.roles.map((role) => ({ id: role.id, name: role.name })),
          everyone: message.mentions.everyone,
        },
        referencedMessage,
      },
    });
  }

  private async onPlayerJoin(event: PlayerJoinEvent) {
    const { world, player, app } = event;

    this.logger.info(_t('console.join', world.name, player.name));

    const embed = new EmbedBuilder();
    embed.setColor(Palette.Join);
    embed.setDescription(_t('discord.join', player.name));
    if (app.minecraft.getWorlds().length >= 2) embed.setFooter({ text: world.name });

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
    if (app.minecraft.getWorlds().length >= 2) embed.setFooter({ text: world.name });

    try {
      await this.app.bot.sendMessage({ embeds: [embed] });
    } catch (error) {
      this.logger.error(error);
    }
  }

  private async onPlayerDie(event: PlayerDieEvent) {
    const { world, player, damagingEntity, app } = event;
    const message = formatDeathMessage({
      playerName: player.name,
      cause: event.cause,
      damagingEntity,
    });

    this.logger.info(`[${world.name}] ${message}`);

    const embed = new EmbedBuilder().setColor(Palette.Death).setDescription(message);
    if (app.minecraft.getWorlds().length >= 2) embed.setFooter({ text: world.name });

    try {
      await this.app.bot.sendMessage({ embeds: [embed] });
    } catch (error) {
      this.logger.error(error);
    }
  }
}
