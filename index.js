const WebSocket = require('ws');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const discord = require('discord.js');
const client = new discord.Client();
const ip = require('ip');
const {getTime,event,command} = require('./util.js');

let connection = null;
const responses = new Map();
let playersNow = [];

// config.jsonから設定を読み込む
const { PORT, TOKEN, CHANNEL, PREFIX, OPROLE, cmdResponse } = require('./config.json');
if (PREFIX === '/' || PREFIX === '//') throw new Error('Prefixに/,//は使えないよ');
const prefixEscaped = new RegExp(`^${PREFIX.replace(/[-\/\\^$*+?.()|\[\]{}]/g, '\\$&')}`);

// discordにログイン
client.login(TOKEN);
client.on('ready', () => {
  console.log(`${client.user.tag} でログインしています。`);
  sendD('[log] 起動しました');
  setInterval(player, 2000);
});

// マイクラ側からの接続時に呼び出される関数
const wss = new WebSocket.Server({ port: PORT });
wss.on('connection', (ws) => {
  connection = ws;

  // イベントを登録
  ws.send(event('PlayerMessage'));
  ws.send(event('commandResponse'));
  
  sendCmd('getlocalplayername').then((data) => {
    console.log(getTime(), `[log] ${data.localplayername} : 接続を開始しました`);
    sendD(`[log] ${data.localplayername} : 接続を開始しました`);
  });
  
  // 接続時に現在のプレイヤーを取得しておく
  getPlayers((data) => playersNow = data.players);
  
  // 各種イベント発生時に呼ばれる関数
  ws.on('message', (packet) => {
    const res = JSON.parse(packet);
    
    if (res.header.messagePurpose == 'commandResponse') {
      if (res.body.recipient === undefined) {
        responses.set(res.header.requestId, res.body);
      }
    }
    
    if (res.header.messagePurpose == 'error') {
      console.log(res);
    }
    
    if (res.body.eventName == 'PlayerMessage') {
      if (res.body.properties.MessageType.match(/(chat|me|say)/) && res.body.properties.Sender !== '外部') {
        
        let Type = res.body.properties.MessageType;
        let rawMessage = res.body.properties.Message;
        let Message = rawMessage.replace(/§./g, '').replace('@', '`@`');
        let rawSender = res.body.properties.Sender;
        let Sender = rawSender.replace(/§./g, '').replace('@', '＠');
        
        if (Message.search(/(@everyone|@here)/) !== -1) return sendMsg(`§4禁止語句が含まれているため送信をブロックしました。`, rawSender);
        
        // minecraft -> discord
        if (Type == 'chat') {
          let chatMessage = `[Minecraft] <${Sender}> ${Message}`; // 普通のチャットの時
          console.log(getTime(), chatMessage);
          sendD(chatMessage);
          
        } else if (Type == 'me') {
          let chatMessage = `[Minecraft] * ${Sender} ${Message}`; // meコマンドのメッセージの時
          console.log(getTime(), chatMessage);
          sendD(chatMessage);
          
        } else if (Type == 'say') {
          let chatMessage = `[Minecraft] ${Message}`; // sayコマンドのメッセージの時
          console.log(getTime(), chatMessage);
          sendD(chatMessage);
          
      }
      }
    }
  });
  
  // 接続の切断時に呼び出される関数
  ws.on('close', () => {
    console.log(getTime(), `[log] 接続が終了しました`);
    sendD(`[log] 接続が終了しました`);
    connection = null;
  });
  
});

console.log(`Minecraft: /connect localhost:${PORT} or /connect ${ip.address()}:${PORT}`);

client.on('message', (message) => {
  // メッセージが送信されたとき
  if (message.author.bot) return;
  if (message.channel.id != CHANNEL) return;
  
  let isOP = message.member.roles.cache.has(OPROLE);
  
  // discord -> minecraft
  let logMessage = `[Discord] ${message.member.displayName} : ${message.cleanContent.replace('\u200B','')}`; // マイクラに送られるメッセージ
  console.log(getTime(), logMessage);
    
  // prefixはconfigで設定できます
  if (message.content.startsWith(PREFIX)) {
    let args = message.content.replace(prefixEscaped, '').split(' ');
    let command = args[0];
    
    if (command === 'help') {
      sendD({ 
        embed: {
          title: 'TN Discord-MCBE BOT Help',
          color: '#4287f5',
          description: `Commands:\n${PREFIX}help - ヘルプを表示\n${PREFIX}list - プレイヤーのリストを表示\n\nWebsocketを使用してマイクラとDiscordのチャットを同期することができるBOTです。\n__バニラワールドで使えます！！__\nダウンロード・使い方はこちらからどうぞ:\nhttps://github.com/tutinoko2048/discord-mcbe`,
          footer: { text: 'Made by Retoruto9900K / Tutinoko9900#1841' }
        }
      });
    }
    
    if (command === 'list') {
      getPlayers((data) => {
        let {current,max,players} = data;
        sendD({
          embed: {
            color: '#4287f5',
            description: `現在の人数: ${current}/${max}\nプレイヤー:\n${(max === 0) ? '__Server is offline__' : players.sort().join(', ')}`,
            footer: { text: `最終更新: ${getTime()}` }
          }
        });
      });
    }
    
  } else if (message.content.startsWith('/')) {
    if (OPROLE === '') return sendD('OPROLEが未設定です');
    if (!isOP) return sendD('権限がありません');
    let cmd = message.content.replace(/^(\/|\/\/)/g, ''); // /または//を先頭につけてコマンドを送信
    sendMsg(`§a${logMessage}`);
    
    sendCmd(cmd).then((data) => {
      if (data.err) return sendD('Error: ' + data.err);
      message.react('☑️');
      if (cmdResponse) sendD({
        embed: {
          color: '#4287f5',
          description: JSON.stringify(data, null, 2),
          footer: { text: `ID: ${message.id}` }
        }
      });
    });
    
  } else {
    sendMsg(`§b${logMessage}`);
    
    // ファイルが送信されたらファイルタイプを送信
    let url = message.attachments.map(x => x.url)[0];
    if (url) {
      let type = url.split('.').pop();
      let fileMessage = `[Discord] ${message.member.displayName} : [${type} file]`;
      console.log(getTime(),fileMessage);
      sendMsg(`§b${fileMessage}`);
    }
  }
  
});
  


//コマンド実行結果を返す
async function sendCmd(command) {
  if (!connection) return {err: 'Server is offline'}
  let json = {
    header: {
      requestId: uuidv4(),
      messagePurpose: "commandRequest",
      version: 1,
      messageType: "commandRequest"
    },
    body: {
      origin: {
        type: "player"
      },
      commandLine: command,
      version: 1
    }
  };
  connection.send(JSON.stringify(json));
  return await getResponse(json.header.requestId).catch(e => { return {err: e.message} });
}

function getResponse(id) {
  return new Promise((res, rej) => {
    let interval = setInterval(() => {
      if (!connection) {
        clearInterval(interval);
        return rej(new Error('Server is offline'));
      }
      if (responses.has(id)) {
        clearInterval(interval);
        res(responses.get(id));
        responses.delete(id);
      }
    }, 50);
  });
}
 
// tellrawメッセージを送信
function sendMsg(msg, target) {
  if (!connection) return;
  target = (target === undefined) ? '@a' : `"${target}"`;
  let rawtext = JSON.stringify({
    rawtext: [{ text: String(msg) }]
  });
  let txt = `tellraw ${target} ${rawtext}`;
  connection.send(command(txt));
}

function sendD(msg, channel = CHANNEL) {
return client.channels.cache.get(channel).send(msg);
}

// ワールド内のプレイヤーを取得
function getPlayers(fn) {
  if (!connection) {
    return fn({
      current: 0,
      max: 0,
      players: []
    });
  }
  sendCmd('list').then((data) => {
    let status = (data.statusCode == 0 && !data.err);
    fn({
      current: status ? data.currentPlayerCount : 0,
      max: status ? data.maxPlayerCount : 0,
      players: status ? data.players.split(', ') : []
    });
  });
}

// 参加・退出通知
function player() {
  getPlayers((data) => {
    let {current,max,players} = data;
    if (players.length > playersNow.length) {
      let joined = players.filter(i => playersNow.indexOf(i) == -1);
      let msg = `Joined: ${joined}  ||  ${current}/${max}`;
      console.log(msg);
      sendD({
        embed: {
          color: '#48f542',
          description: `**${msg}**`
        }
      });
    }
    if (players.length < playersNow.length) {
      let left = playersNow.filter(i => players.indexOf(i) == -1);
      let msg = `Left: ${left}  ||  ${current}/${max}`;
      console.log(msg);
      sendD({
        embed: {
          color: '#f54242',
          description: `**${msg}**`
        }
      });
    }
    playersNow = players;
    client.user.setActivity(`Server: ${max === 0 ? 'OFFLINE' : `${current}/${max}`} | ${PREFIX}help`);
  });
}
