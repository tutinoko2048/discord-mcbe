const embeds = require('../embeds');
const { EmbedBuilder } = require('discord.js');
const fs = require('fs');

  /**
   * @param {import('../index')} main
   * @param {import('discord.js').Message} message
   */
async function handleMessage(main, message) {
  const isCommand = message.content.startsWith('/');
  let content = message.cleanContent;
  
  if (isCommand) {
    const isOP = message.member.roles.cache.hasAny(...main.config.command_role_id);
    if (!isOP) return message.reply({
      embeds: [ embeds.error(main.lang.run('command.error.nopermission')) ]
    });
    
    const command = content.replace(/^\/*/, '');
    content = command;
    
    const embed = new EmbedBuilder()
      .setDescription(main.lang.run('command.command.sending'))
      .setFooter({
        text: `Requested by ${message.member.displayName}`,
        iconURL: message.author.displayAvatarURL()
      });
    const msg = await message.reply({ embeds: [embed] });
    
    const res = await sendCommand(main, command, embed);
    await msg.edit({ embeds: [res.embed], files: res.files });
    if (res.files) fs.unlinkSync(res.files[0]);
  }

  if (!isCommand && main.config.discord_message_filters) {
    let filters = main.config.discord_message_filters;
    if (!Array.isArray(filters)) filters = [ filters ];

    for (const filter of filters) {
      const result = applyMessageFilter(content, filter);
      if (result.action === 'cancel') return;
      if (result.action === 'update' && result.updatedContent) {
        content = result.updatedContent;
      }
    }
  }
  
  const langKey = isCommand ? 'command' : 'message';
  main.logger.log(main.lang.run(`console.${langKey}`, [
    message.member?.displayName,
    isCommand ? `/${content}` : content
  ]));
  
  main.server.sendMessage(main.lang.run(`minecraft.${langKey}`, [
    message.member?.displayName,
    isCommand ? `/${content}` : content
  ]));
  
  if (message.attachments.size > 0) {
    const attachMessage = formatAttachments(message.attachments);
    main.logger.log(main.lang.run('console.attachments', [
      message.member?.displayName,
      attachMessage
    ]));
    
    main.server.sendMessage(main.lang.run('minecraft.attachments', [
      message.member?.displayName,
      attachMessage
    ]));
  }
}

/** @typedef {{ embed: import('discord.js').EmbedBuilder, error: boolean, files?: string[] }} CommandResponse */
/** @typedef {{ onlyMessage?: boolean, worlds?: import('socket-be').World[] }} SendOptions */

  /**
   * @param {import('../index')} main
   * @param {string} command
   * @param {import('discord.js').EmbedBuilder} embed
   * @param {SendOptions} [options]
   * @returns {Promise<CommandResponse>}
   */
async function sendCommand(main, command, embed, options) {
  const onlyMessage = options?.onlyMessage ?? false;
  const worlds = options?.worlds ?? main.server.getWorlds();
  if (worlds.length === 0) return {
    embed: embeds.error(main.lang.run('command.error.noworlds')),
    error: true
  }
  
  main.logger.log(`Broadcasting command... ${JSON.stringify(`/${command}`)}`);
  const promiseResult = await Promise.allSettled(worlds.map(w => w.runCommand(command)));
  const results = promiseResult.map(x => (
    x.status === 'fulfilled'
      ? onlyMessage ? x.value?.statusMessage : x.value
      : { error: x.reason }
  ));
  
  const resultMessage = JSON.stringify(results.length > 1 ? results : results[0], null, 2);
  let description = `\`\`\`json\n${resultMessage}\n\`\`\``
  let files;
  
  if (description.length > 1200) {
    description = '実行結果が長すぎるためファイルとして出力しました';
    const fileName = `data/result${Date.now()}.txt`;
    fs.writeFileSync(fileName, resultMessage);
    files = [ fileName ];
  }
  
  embed.setColor(embeds.colors.success)
    .setTimestamp(Date.now())
    .setAuthor({ name: 'Result' })
    .setDescription(description);
    
  return { embed, files, error: false }
}

const maxFileMessages = 4;
/** @param {import('discord.js').Collection<string, import('discord.js').Attachment>} attachments */
function formatAttachments(attachments) {
  const safeString = (str, length) => str.slice(0, length).concat(str.length > length ? '..' : '');
  
  const files = attachments.map(attachment => {
    const type = attachment.contentType ?? '';
    if (type.match(/image|video|text/)) return `[${type.split('/')[0]}]`;
    
    const names = attachment.name.split('.');
    const extension = names.pop();
    return `[${safeString(names.join('.'), 12)}.${extension}]`;
  });
  return files.slice(0, maxFileMessages).join(', ').concat(files.length > maxFileMessages ? '...' : '');
}

/**
 * @param {string} content
 * @param {import('../types').MessageFilter} filter
 * @returns {{ action: 'none' | 'cancel' | 'update', updatedContent?: string }} False if the message should be ignored
 */
function applyMessageFilter(content, filter) {
  let updatedContent = content;
  let isChanged = false;
  
  if ('max_content_length' in filter && updatedContent.length > filter.max_content_length) {
    if (filter.on_fail === 'cancel') return { action: 'cancel' };
    if (filter.on_fail === 'shorten') {
      updatedContent = updatedContent.slice(0, filter.max_content_length) + '..';
      isChanged = true;
    }
  }

  if ('max_lines' in filter) {
    const lines = updatedContent.split('\n');
    if (lines.length > filter.max_lines) {
      if (filter.on_fail === 'cancel') return { action: 'cancel' };
      if (filter.on_fail === 'shorten') {
        updatedContent = lines.slice(0, filter.max_lines).join('\n') + '..';
        isChanged = true;
      }
    }
  }

  if ('ignore_content_regex' in filter && filter.ignore_content_regex) {
    const regex = new RegExp(filter.ignore_content_regex, 'g');
    if (regex.test(updatedContent)) {
      if (filter.on_fail === 'cancel') return { action: 'cancel' };
      if (filter.on_fail === 'hide') {
        updatedContent = updatedContent.replaceAll(regex, '***');
        isChanged = true;
      }
    }
  }

  if (isChanged) {
    return { action: 'update', updatedContent };
  }

  return { action: 'none' };
}

module.exports = { handleMessage, sendCommand }
