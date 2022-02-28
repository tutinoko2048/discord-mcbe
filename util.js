const { v4: uuidv4 } = require('uuid');
const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Tokyo'); // タイムゾーンを設定

console.log(getTime(), '[log] util.js loaded');

// プレイヤー名の配列を突っ込むと名前予測してくれるやつ
function expectPlayerName(maybe, array) {
  let lowPlayers = array.map(x=>x.toLowerCase());
  let match = lowPlayers.indexOf(maybe.toLowerCase());
  if (match !== -1) return {name: array[match], match: true, found: true} // 完全一致
  for (let num in lowPlayers) {
    if (lowPlayers[num].includes(maybe.toLowerCase())) {
      return {name: array[num], match: false, found: true} // 一部一致
    }
  }
  return {name: maybe, match: false, found: false} // not found
}

// 時間取得用
function getTime(mode) {
  let time = (mode === 'date') ? moment().format('MM/DD HH:mm:ss') : moment().format('HH:mm:ss');
  return time
}

//ユーザー発言時のイベント登録用JSON文字列を生成する関数
function event(name) {
  return JSON.stringify({
    header: {
      requestId: uuidv4(),
      messagePurpose: 'subscribe',
      version: 1,
      messageType: 'commandRequest'
    },
    body: {
      eventName: name
    }
  });
}

//コマンドを実行するのに必要なやつ
function command(x) {
  return JSON.stringify({
    header: {
      requestId: uuidv4(),
      messagePurpose: 'commandRequest',
      version: 1,
      messageType: 'commandRequest'
    },
    body: {
      origin: {
        type: 'player'
      },
      commandLine: x,
      version: 1
    }
  });
}

module.exports = {getTime,event,command,expectPlayerName}
