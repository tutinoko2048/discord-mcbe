const WebSocket = require('ws');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const discord = require("discord.js");
const client = new discord.Client();
const ip = require("ip");
let connection = null;

//Websocketサーバーのポート番号
const port = 8000;
//discordのBOTのトークン(流出注意)
const token = 'BOTのトークン';
//メッセージを送信したいチャンネルのID
const channelId = 'チャンネルのID';

//discordにログイン
client.login(token);
client.on('ready', () => {
  console.log(`${client.user.tag} でログインしています。`);
  client.channels.cache.get(channelId).send('[log] 起動しました');
})

// マイクラ側からの接続時に呼び出される関数
const wss = new WebSocket.Server({ port: port });
wss.on('connection', ws => {
  connection = ws;

  console.log('[log] 接続を開始しました');
  client.channels.cache.get(channelId).send('[log] 接続を開始しました');

  // ユーザー発言時のイベントをsubscribe
  ws.send(event('PlayerMessage'));
  ws.send(event('commandResponse'));
  
  getPlayers(callback => {
    let {players} = callback;
    fs.writeFileSync('players.json', JSON.stringify(players, null, 2));
  });

  setInterval(player, 2000);
  
  // 各種イベント発生時に呼ばれる関数
  ws.on('message', packet => {
    const res = JSON.parse(packet);
    if (res.body.eventName == 'PlayerMessage') {
      if (res.body.properties.MessageType == 'chat' && res.body.properties.Sender != '外部') {
        let Message = res.body.properties.Message;
        let Sender = res.body.properties.Sender;
        let chatMessage = `[${getTime()}] ${Sender.replace(/§./g, '')} : ${Message.replace(/§./g, '')}`;
        console.log(chatMessage);
        
        //minecraft->discord
        //@everyone,@hereが含まれていたら送信をブロック
        if (res.body.properties.Message.search(/(@everyone|@here)/) === -1) {
          client.channels.cache.get(channelId).send(chatMessage);
        } else {
          sendMsg(`§4禁止語句が含まれているため送信をブロックしました。`, Sender);
        }
      }
    }
  });
});

console.log(`Minecraft: /connect ${ip.address()}:${port}`);


//discord->minecraft
client.on('message', message => {
  // メッセージが送信されたとき
  if (message.author.bot) return;
  let logMessage = `[discord-${getTime()}] ${message.member.displayName} : ${message.content}`;
  console.log(logMessage);
  if (connection == null) return;
  sendMsg(`§b${logMessage}`);
});
  
//時間取得用
function getTime() {
  let date = new Date();
  let hour = date.getHours();
  let minute = date.getMinutes();
  let second = date.getSeconds();
  hour = ('0' + hour).slice(-2);
  minute = ('0' + minute).slice(-2);
  second = ('0' + second).slice(-2);
  let time = hour + ':' + minute + ':' + second;
  return time;
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

//レスポンス付きでコマンド実行
function sendCmd(command, callback) {
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
  if (callback == undefined) return;
  connection.on('message', packet => {
    let res = JSON.parse(packet);
    if (res.header.requestId == json.header.requestId) {
      callback(res.body);
    }
  });
}

//tellrawを送信
function sendMsg(msg, target) {
  if (target == undefined) target = '@a';
  let txt = `tellraw ${target} {"rawtext":[{"text":"${msg}"}]}`;
  connection.send(command(txt));
}

//ワールド内のプレイヤーを取得
function getPlayers(fn) {
  sendCmd('list', callback => {
    let info = {
      current: callback.statusCode < 0 ? 0 : callback.currentPlayerCount,
      max: callback.statusCode < 0 ? 0 : callback.maxPlayerCount,
      players: callback.statusCode < 0 ? [] : callback.players.split(', ')
    }
    fn(info);
  });
}

//参加・退出通知
function player() {
  getPlayers(callback => {
    let {current,max,players} = callback;
    let playersBefore = JSON.parse(fs.readFileSync('players.json'));
    fs.writeFileSync('players.json', JSON.stringify(players, null, 2));
    
    if (players.length > playersBefore.length) {
      let joined = players.filter(i => playersBefore.indexOf(i) == -1);
      let msg = `Joined: ${joined}  ||  ${current}/${max}`;
      console.log(msg);
      client.channels.cache.get(channelId).send({
        embed: {
          color: '#48f542',
          description: `**${msg}**`
        }
      });
    }
    if (players.length < playersBefore.length) {
      let left = playersBefore.filter(i => players.indexOf(i) == -1);
      let msg = `Left: ${left}  ||  ${current}/${max}`;
      console.log(msg);
      client.channels.cache.get(channelId).send({
        embed: {
          color: '#f54242',
          description: `**${msg}**`
        }
      });
    }
  });
}
