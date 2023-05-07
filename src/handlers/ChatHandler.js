const customRegex = [
  // TNAC (default)
  new RegExp(/\[(?:スクリプト エンジン|Script Engine)\] "\[(?:TN-AntiCheat|TN-AC)\] (.*)"/mi),
  // TNAC (std***)
  new RegExp(/\[メッセージ\] (?:スクリプト エンジン|Script Engine): "\[(?:TN-AntiCheat|TN-AC)\] (.*)"/mi),
];

  /**
   * @param {import('../index')} main
   * @param {import('socket-be').PlayerChatEvent} chatEvent
   */
async function handleChat(main, chatEvent) {
  const { world, sender, message, type } = chatEvent;
  const safeSender = safeString(sender, main.config.delete_color_prefix);
  const safeMessage = safeString(message, main.config.delete_color_prefix);
  
  const isMultiWorld = main.server.getWorlds().length > 1;
  const worldName = isMultiWorld ? `[${world.name.split(' ')[1]}] ` : '';
  
  switch (type) {
    case 'chat':
      world.logger.log(main.lang.run('console.chat', [ sender, message ]));
      await main.sendDiscord(worldName + main.lang.run('discord.chat', [ safeSender, safeMessage ]));
      break;
    case 'me':
      world.logger.log(main.lang.run('console.me', [ sender, message ]));
      await main.sendDiscord(worldName + main.lang.run('discord.me', [ safeSender, safeMessage ]));
      break;
    case 'say': {
      const formatted = main.config.use_custom_regex && formatRegex(safeMessage);
      
      world.logger.log(main.lang.run('console.say', [ message ]));
      await main.sendDiscord(worldName + main.lang.run('discord.say', [ formatted ?? safeMessage ]));
      break;
    }
  }
}

/** @param {string} message */
function formatRegex(message) {
  return customRegex.map(r => message.match(r)?.[1]).filter(Boolean)[0];
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