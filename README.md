# discord-mcbe
websocketでマイクラとdiscordを繋ぐやつです。<br>
https://youtu.be/BEv4oozeQKU<br>
<br>
![example2](docs/example2.jpeg)<br>
![example1](docs/example1.jpeg)<br>
![runCommand](docs/runCommand.jpeg)<br>

## 使い方
### インストール
pcの場合はnodejsをインストール<br>
https://nodejs.org/ja/<br>
<br>
iosはplay.js, androidはtermuxというアプリがおすすめです。<br>

### botの準備
discordのbotが必要なので用意してください。

### コピペしてみよう
config.jsonにサーバーのポート,discordbotのtoken,メッセージを送信するチャンネルのIDを入力してください。<br>
必要なモジュールも入れておいてください

### 動かす
サーバーを動かしてから、マイクラ側で<br>
```/connect [ipアドレス]:[ポート]```<br>
のコマンドを実行します<br>
これでチャットがどちらにも送られるようになるはずです

## /connectしても繋がらないときは
pc版で繋がらないときは<br>
```CheckNetIsolation.exe LoopbackExempt -a -n="Microsoft.MinecraftUWP_8wekyb3d8bbwe```<br>
をコマンドプロンプトで**管理者権限**で実行するといけるみたいです

## config.json
PORT: websocketをlistenするポート<br>
TOKEN: DiscordBOTのトークン<br>
CHANNEL: メッセージを送信するチャンネルのID<br>
PREFIX: コマンドのPrefix<br>
OPROLE: マイクラのコマンドを実行できる管理者ロールのID<br>
cmdResponse: コマンド実行時の結果を表示するかどうか<br>