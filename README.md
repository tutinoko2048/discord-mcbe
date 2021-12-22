# discord-mcbe
websocketでマイクラとdiscordを繋ぐやつです。<br>
<br>
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/tutinoko2048/discord-mcbe/blob/main/LICENSE)<br>
<br>
modules:<br>
ws, uuid, discord.js, ip<br>


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
