// @ts-check

  /**
   * @param {import('../index')} main
   * @param {import('socket-be').PlayerChatEvent} chatEvent
   */
async function handleChat(main, chatEvent) {
  const { world, sender, message, type } = chatEvent;
  const safeSender = safeString(sender, main.config.delete_color_prefix);
  const safeMessage = safeString(message, main.config.delete_color_prefix);
  
  const isMultiWorld = main.server.getWorlds().length > 1;
  const prefix = isMultiWorld ? `[${world.name.split(' ')[1]}] ` : '';
  
  switch (type) {
    case 'chat':
      world.logger.log(main.lang.run('console.chat', [ sender, message ]));
      await main.sendDiscord(prefix + main.lang.run('discord.chat', [ safeSender, safeMessage ]));
      break;
    case 'me':
      world.logger.log(main.lang.run('console.me', [ sender, message ]));
      await main.sendDiscord(prefix + main.lang.run('discord.me', [ safeSender, safeMessage ]));
      break;
    case 'say':
      world.logger.log(main.lang.run('console.say', [ message ]));
      await main.sendDiscord(prefix + main.lang.run('discord.say', [ safeMessage ]));
      break;
  }
}

const MAX_MESSAGE_LENGTH = 1000;
  /**
   * @param {string} str
   * @param {boolean} deleteColor
   */
function safeString(str, deleteColor) {
  const at = str.replace(/@/g, '＠');
  const colored = deleteColor ? at.replace(/§./g, '') : at;
  let sliced = colored.slice(0, MAX_MESSAGE_LENGTH);
  if (colored.length > MAX_MESSAGE_LENGTH) sliced += '...';
  return sliced;
}

module.exports = { handleChat };