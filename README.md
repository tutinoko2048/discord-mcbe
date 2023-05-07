# discord-mcbe
  
<img src="https://img.shields.io/github/downloads/tutinoko2048/discord-mcbe/total?style=for-the-badge">
  
websocketでマイクラとdiscordを繋ぐやつです。  
MinecraftBE バニラ環境で動かせます。  
https://youtu.be/BEv4oozeQKU  
  
![example2](docs/example2.jpeg)  
![example1](docs/example1.jpeg)  
![runCommand](docs/runCommand.jpeg)  
![list](docs/list.jpeg)  
  
[Discord サポートサーバー](https://discord.gg/XGR8FcCeFc)

## 使い方
### Nodejsをインストール
Nodejs v16.6以上をインストールしてください
https://nodejs.org/ja/  

### botを作る
discordのbotが必要なので用意してください。
(botアカウントの作り方はここでは省略します)  

### Configの編集
[ここから最新のものをダウンロード](https://github.com/tutinoko2048/discord-mcbe/releases)して展開してください。  
その中の`config.jsonc`ファイルを編集して必要な値を入力してください

### 動かす
> **Note**: マイクラの設定で `暗号化されたWebsocketの要求` がオフになっていることを確認してください  
> **Note**: PCで動かす場合はループバック接続を許可してください  

`start.cmd`を実行してサーバーを起動させましょう。  
次にマイクラ側で  
```/connect [ローカルIP]:[ポート]```  
```/connect localhost:[ポート]``` (同じ端末の場合)  
のコマンドを実行します  
これで接続することができます

## ループバック接続を許可する
- ループバック接続を許可する(pcの場合)
こちらのコマンドをコマンドプロンプトで**管理者権限**で実行してください  
`CheckNetIsolation.exe LoopbackExempt –a –p=S-1-15-2-1958404141-86561845-1752920682-3514627264-368642714-62675701-733520436;`  
または `loopback.cmd` を実行してください(同じコマンドが入っています)
- ファイアウォールが邪魔してることもあるのでうまく設定してください

## Config
coming soon...

## メッセージのカスタマイズ
lang/[言語名].langでメッセージのテンプレートを編集できます