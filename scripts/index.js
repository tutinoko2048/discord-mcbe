import { App } from '../projects/server';

/** 
 * @param {App} app
 */
export default function main(app) {
  console.log('[Script] loaded!');

  app;
}

// const PREFIX = '.';
// server.events.on('playerChat', async ev => {
//   const { message, world } = ev;
  
//   if (message.startsWith(PREFIX)) { // チャットの擬似コマンドのサンプル
//     const [ command ] = message.slice(PREFIX.length).split(' ');
    
//     if (command === 'help') {
//       await world.sendMessage([
//         `§b[discord-mcbe]§r`,
//         `§7-§f version: §e${version}§r`,
//         `§7-§f client: §6${world.localPlayer}§r`,
//         '§7Made by RetoRuto9900K / tutinoko2048§r'
//       ].join('\n'));
//     }
    
//     if (command === 'ping') {
//       await world.sendMessage([
//         '§b[discord-mcbe]§r Pong!',
//         `§7-§f WS: ${world.ping}ms`,
//         `§7-§f Discord: ${client.ws.ping}ms`
//       ].join('\n'));
//     }
//   }
// })

/*
client.on('ready', () => {
  console.log('ready:', client.user.tag);
});

server.events.on('serverOpen', () => {
  console.log('open');
});
*/
