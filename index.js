/*
modules:
ws, uuid, discord.js, ip
*/

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const discord = require("discord.js");
const client = new discord.Client();
const ip = require("ip");

//Websocketサーバーのポート番号
const port = 3000;
//discordのbotのトークン(流出注意)
const token = 'ここにdiscordbotのトークンを入力';
//メッセージを送信したいチャンネルのid
const channelId = 'ここにdiscordのチャンネルのidを入力';


const wss = new WebSocket.Server({ port: port });
client.login(token);
client.on('ready', () => {
  console.log(`${client.user.tag} でログインしています。`);
  client.channels.cache.get(channelId).send('[log] 起動しました');
})

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

// マイクラ側からの接続時に呼び出される関数

wss.on('connection', (ws) => {
  console.log('[log] 接続を開始しました');
  client.channels.cache.get(channelId).send('[log] 接続を開始しました');

  // ユーザー発言時のイベントをsubscribe
  ws.send(event('PlayerMessage'));

  // 各種イベント発生時に呼ばれる関数
  ws.on('message', packet => {
    const res = JSON.parse(packet);
    if (res.body.eventName === 'PlayerMessage') {
      if (res.header.messagePurpose === 'event' && res.body.properties.MessageType !== 'title' && res.body.properties.Sender !== '外部' && !res.body.properties.Message.startsWith('{') ) {
        let Message = res.body.properties.Message;
        let Sender = res.body.properties.Sender;
        let sendTime = getTime();
        let result = `[Minecraft-${sendTime}] ${Sender} : ${Message}`;
        console.log(result);
        
        //minecraft->discord
        //@everyone,@hereが含まれていたら送信をブロック
        if (res.body.properties.Message.search(/(@everyone|@here)/) === -1) {
          client.channels.cache.get(channelId).send(result);
        } else {
          ws.send(command(`tellraw ${Sender} {\"rawtext\":[{\"text\":\"§4禁止語句が含まれているため送信をブロックしました。\"}]}`))
        }
      }
    }
  });
  
  //discord->minecraft
  client.on('message', message => {
    // メッセージが送信されたとき
    if (message.author.bot) {
      return;
    }
    if (message.channel.id == channelId) {
      let sendTime = getTime();
      let userName = message.author.username;
      let logMessage = `§b[discord-${sendTime}] ${userName} : ${message.content}`;
      console.log(logMessage);
      ws.send(command('tellraw @a {\"rawtext\":[{\"text\":\"' + logMessage + '\"}]}'));
    }
  });   
});

console.log(`Minecraft: /connect ${ip.address()}:${port}`)
