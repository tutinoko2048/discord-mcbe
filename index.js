const WebSocket = require('ws');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const discord = require("discord.js");
const client = new discord.Client();
const ip = require("ip");
let connection = null;
const formation = new Map();

// config.jsonから設定を読み込む
const { PORT, TOKEN, CHANNEL } = require('./config.json');

//discordにログイン
client.login(TOKEN);
client.on('ready', () => {
  console.log(`${client.user.tag} でログインしています。`);
  sendD('[log] 起動しました');
})

// マイクラ側からの接続時に呼び出される関数
const wss = new WebSocket.Server({ port: PORT });
wss.on('connection', ws => {
  connection = ws;

  console.log('[log] 接続を開始しました');
  sendD('[log] 接続を開始しました');

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
    
    if (res.header.messagePurpose == 'commandResponse') {
      if (res.body.recipient == undefined) {
        formation.set(res.header.requestId, res.body)
      }
    }
    
    if (res.body.eventName == 'PlayerMessage') {
      if (res.body.properties.MessageType == 'chat' && res.body.properties.Sender != '外部') {
        let Message = res.body.properties.Message;
        let Sender = res.body.properties.Sender;
        
        let chatMessage = `[${getTime()}] ${Sender.replace(/§./g, '')} : ${Message.replace(/§./g, '')}`;
        console.log(chatMessage);
        
        //minecraft->discord
        //@everyone,@hereが含まれていたら送信をブロック
        if (res.body.properties.Message.search(/(@everyone|@here)/) === -1) {
          sendD(chatMessage);
        } else {
          sendMsg(`§4禁止語句が含まれているため送信をブロックしました。`, Sender);
        }
      }
    }
  });
  
  ws.on('close', () => {
    console.log(`[log] 接続が終了しました`);
    sendD(`[log] 接続が終了しました`);
    connection = null;
  });
  
});

console.log(`Minecraft: /connect ${ip.address()}:${PORT}`);


//discord->minecraft
client.on('message', message => {
  // メッセージが送信されたとき
  if (message.author.bot) return;
  if (message.channel.id != CHANNEL) return;
  let logMessage = `[discord-${getTime()}] ${message.member.displayName} : ${message.content}`;
  console.log(logMessage);
  sendMsg(`§b${logMessage}`);
});
  
//時間取得用
function getTime(mode) {
  let date = new Date();
  let month = date.getMonth()+1;
  let day = date.getDate();
  let hour = ('0' + (date.getHours()+9)).slice(-2);
  let minute = ('0' + date.getMinutes()).slice(-2);
  let second = ('0' + date.getSeconds()).slice(-2);
  if (mode == 'date') {
    return `${month}/${day} ${hour}:${minute}:${second}`;
  } else {
    return `${hour}:${minute}:${second}`;
  }
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
    },500);
  });
}
 
//tellrawメッセージを送信
function sendMsg(msg, target) {
  if (!connection) return;
  target = (target === undefined) ? '@a' : `"${target}"`;
  let rawtext = JSON.stringify({
    rawtext: [{ text: String(msg) }]
  });
  let txt = `tellraw ${target} ${rawtext}`;
  console.log(txt)
  connection.send(command(txt));
}

function sendD(msg, channel) {
  if (channel == undefined) channel = CHANNEL;
  return client.channels.cache.get(channel).send(msg);
}


//ワールド内のプレイヤーを取得
function getPlayers(fn) {
  if (!connection) {
    fn({
      current: 0,
      max: 0,
      players: []
    })
    return;
  }
  sendCmd('list').then( callback => {
    fn({
      current: callback.statusCode < 0 ? 0 : callback.currentPlayerCount,
      max: callback.statusCode < 0 ? 0 : callback.maxPlayerCount,
      players: callback.statusCode < 0 ? [] : callback.players.split(', ')
    })
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
      sendD({
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
      sendD({
        embed: {
          color: '#f54242',
          description: `**${msg}**`
        }
      });
    }
  });
}