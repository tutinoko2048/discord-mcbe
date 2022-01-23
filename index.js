const WebSocket = require('ws');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const discord = require('discord.js');
const client = new discord.Client();
const ip = require('ip');
const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Tokyo'); // タイムゾーンを設定
let connection = null;
const formation = new Map();
const playersNow = [];

// config.jsonから設定を読み込む
const { PORT, TOKEN, CHANNEL, PREFIX } = require('./config.json');

// discordにログイン
client.login(TOKEN);
client.on('ready', () => {
  console.log(`${client.user.tag} でログインしています。`);
  sendD('[log] 起動しました');
});

// マイクラ側からの接続時に呼び出される関数
const wss = new WebSocket.Server({ port: PORT });
wss.on('connection', ws => {
  connection = ws;

  sendCmd('getlocalplayername').then(data => {
    console.log(getTime(), `[log] ${data.localplayername} : 接続を開始しました`);
    sendD(`[log] ${data.localplayername} : 接続を開始しました`);
  });

  // イベントを登録
  ws.send(event('PlayerMessage'));
  ws.send(event('commandResponse'));
  
  // 接続時に現在のプレイヤーを取得しておく
  getPlayers(data => playersNow = data.players);
  
  // 参加・退出通知
  setInterval(player, 2000);
  
  // 各種イベント発生時に呼ばれる関数
  ws.on('message', packet => {
    const res = JSON.parse(packet);
    
    if (res.header.messagePurpose == 'commandResponse') {
      if (res.body.recipient == undefined) {
        formation.set(res.header.requestId, res.body)
      }
    }
    
    if (res.body.eventName == 'PlayerMessage') {
      if (res.body.properties.MessageType == 'chat' && res.body.properties.Sender != '外部') {
        let Message = res.body.properties.Message;
        let Sender = res.body.properties.Sender;
        
        let chatMessage = `[${getTime()}] ${Sender.replace(/§./g, '')} : ${Message.replace(/§./g, '').replace('@', '`@`')}`;
        console.log(chatMessage);
        
        //minecraft->discord
        if (chatMessage.search(/(@everyone|@here)/) === -1) {
          sendD(chatMessage);
        } else {
          sendMsg(`§4禁止語句が含まれているため送信をブロックしました。`, Sender);
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

console.log(`Minecraft: /connect ${ip.address()}:${PORT}`);


// discord->minecraft
client.on('message', message => {
  // メッセージが送信されたとき
  if (message.author.bot) return;
  if (message.channel.id != CHANNEL) return;
  
  // command or message
  if (message.content.startsWith(PREFIX)) {
    let command = message.content.replace(new RegExp(`^(${PREFIX})`), '');
    
    // .list でワールド内のプレイヤー一覧を表示
    if (command == 'list') {
      getPlayers(data =>  {
        let {current,max,players} = data;
        sendD({
          embed: {
            color: '#4287f5',
            description: `現在の人数: ${current}/${max}\nプレイヤー:\n${players.sort().join(',')}`,
            footer: {
              text: `最終更新: ${getTime()}`
            }
          }
        });
      });
    }
  } else {
    let logMessage = `[discord-${getTime()}] ${message.member.displayName} : ${message.content}`;
    console.log(logMessage);
    sendMsg(`§b${logMessage}`);
  }
  
});
  
//時間取得用
function getTime(mode) {
  let time = (mode === 'date') ? moment().format('MM/DD HH:mm:ss') : moment().format('HH:mm:ss');
  return time
}

//ユーザー発言時のイベント登録用JSON文字列を生成する関数
function event(name) {
  return JSON.stringify({
    "header": {
      "requestId": uuidv4(),
      "messagePurpose": "subscribe",
      "version": 1,
      "messageType": "commandRequest"
    },
    "body": {
      "eventName": name
    }
  });
}

//コマンドを実行するのに必要なやつ
function command(x) {
  return JSON.stringify({
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
      commandLine: x,
      version: 1
    }
  });
}

//コマンド実行結果を返す
async function sendCmd(command) {
  if (!connection) return;
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
  return await getResponse(json.header.requestId);
}

function getResponse(id) {
  return new Promise( (res, rej) =>{
    let interval = setInterval(() => {
      if (!connection) {
        clearInterval(interval);
        return rej();
      }
      let response = formation.get(id);
      if (response != undefined) {
        formation.delete(id);
        clearInterval(interval);
        res(response);
      }
    }, 200);
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
    fn({
      current: 0,
      max: 0,
      players: []
    })
    return;
  }
  sendCmd('list').then(data => {
    fn({
      current: data.statusCode < 0 ? 0 : data.currentPlayerCount,
      max: data.statusCode < 0 ? 0 : data.maxPlayerCount,
      players: data.statusCode < 0 ? [] : data.players.split(', ')
    })
  });
}

// 参加・退出通知
function player() {
  getPlayers(data => {
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
  });
}
