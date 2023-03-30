# discord-mcbe
  
<img src="https://img.shields.io/github/downloads/tutinoko2048/discord-mcbe/total?style=for-the-badge">
  
websocketでマイクラとdiscordを繋ぐやつです。  
MinecraftBE バニラ環境で動かせます。  
https://youtu.be/BEv4oozeQKU  
  
![example2](docs/example2.jpeg)  
![example1](docs/example1.jpeg)  
![runCommand](docs/runCommand.jpeg)  
![list](docs/list.jpeg)  
  
質問などあればどうぞ: [Discord](https://discord.gg/XGR8FcCeFc)

## 使い方
### インストール
nodejsをインストールする必要があります  
https://nodejs.org/ja/  


### botの準備
discordのbotが必要なので用意してください。
(botアカウントの作り方はここでは省略します)  

### コピペしてみよう
[ここ](https://github.com/tutinoko2048/discord-mcbe/releases)から最新のものをダウンロードして展開してください。  
その中にconfig.jsonが入っているので全て入力してください  

### 動かす
`start.cmd`を実行してサーバーを起動させましょう。  
次にマイクラ側で  
```/connect [ローカルIP]:[ポート]```  
```/connect localhost:[ポート]``` (同じ端末の場合)  
のコマンドを実行します  
これで接続することができます

## /connectしても繋がらないときは
- マイクラ側の設定で 暗号化されたWebsocketの要求 をオフにする
- ループバック接続を許可する(pcの場合  
```CheckNetIsolation.exe LoopbackExempt -a -n="Microsoft.MinecraftUWP_8wekyb3d8bbwe"```  
をコマンドプロンプトで__管理者権限__で実行してください
- ウイルス対策ソフトが邪魔してることもあるのでうまく設定してください

## config.json
PORT: websocketをlistenするポート  
TOKEN: DiscordBOTのトークン  
CHANNEL: メッセージを送信するチャンネルのID  
PREFIX: コマンドのPrefix  
OPROLE: マイクラのコマンドを実行できる管理者ロールのID  
cmdResponse: コマンド実行時の結果を表示するかどうか  

## メッセージをカスタマイズする
lang.jsを書き換えることで送信するメッセージをカスタマイズできます。  
アップデートする時もlang.jsを新しい方に持ってくることで簡単に引き継ぐことができます