# discord-mcbe
websocketでマイクラとdiscordを繋ぐやつ
<br>
modules:<br>
ws, uuid, discord.js, ip<br>

```
npm i ws uuid discord.js ip
```

## 使い方
### インストール
pcの場合はnodejsをインストール<br>
https://nodejs.org/ja/<br>
<br>
iosはplay.js, androidはtermuxというアプリがおすすめです。<br>

### botの準備
discordのbotが必要なので用意してください。

### コピペしてみよう
上の方にサーバーのポート,discordbotのtoken,メッセージを送信するチャンネルのIDを入力してください。<br>
必要なモジュールも入れておいてください

### 動かす
サーバーを動かしてから、マイクラ側で<br>
```/connect [ipアドレス]:[ポート]```
のコマンドを実行します<br>
これでチャットがどちらにも送られるようになるはずです

## /connectしても繋がらないときは
pc版で繋がらないときは
```CheckNetIsolation.exe LoopbackExempt -a -n="Microsoft.MinecraftUWP_8wekyb3d8bbwe```
をコマンドプロンプトで**管理者権限**で実行するといけるみたいです
