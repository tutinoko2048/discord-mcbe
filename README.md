# discord-mcbe
  
<img src="https://img.shields.io/github/downloads/tutinoko2048/discord-mcbe/total?style=for-the-badge">
  
MinecraftBEでdiscordとチャットを繋ぐことができるDiscord Botです。バニラ環境で動きます。  
https://youtu.be/BEv4oozeQKU  
  
![example2](docs/example2.jpeg)  
![example1](docs/example1.jpeg)  
![runCommand](docs/runCommand.jpeg)  
![list](docs/list.jpeg)  
  
[Discord サポートサーバー](https://discord.gg/XGR8FcCeFc)

## 動作環境
- 基本的にはWindowsのPCでの動作を想定しています
- MinecraftBEのシングル/マルチワールド用です。BDSなどのサーバーでは使用できません
- 双方向のチャットするにはワールドのホスト(鯖主)が繋げる必要があります

## 使い方
### Nodejsをインストール
Nodejs v16.6以上をインストールしてください  
https://nodejs.org/ja/  

### botを作る
discordのbotが必要なので用意してください。  
(botアカウントの作り方はここでは省略します)  

### Configを編集
[ここから最新のものをダウンロード](https://github.com/tutinoko2048/discord-mcbe/releases)して展開してください。  
その中の`config.jsonc`ファイルを編集して必要な値を入力してください  
[Configの内容はこちらから](#config)

### 動かす
> **Note**: マイクラの設定で `暗号化されたWebsocketの要求` がオフになっていることを確認してください  
  
> **Note**: PCで動かす場合はループバック接続を許可してください [詳しくはこちら](#ループバック接続の許可)  

`start.cmd`を実行してサーバーを起動させましょう。  
次にマイクラ側で  
```/connect [ローカルIP]:[ポート]```  
```/connect localhost:[ポート]``` (同じ端末の場合)  
のコマンドを実行します  
これで接続することができます

## コマンド一覧
- /help  
ワールドにコマンドを送信します

- /ping  
ボットとワールドの応答速度を表示します

- /list  
プレイヤーリストを表示します

- /command <コマンド> [ワールド]  
ワールドにコマンドを送信します

- /tell <送り先> <メッセージ>  
tellでメッセージをプレイヤーに送信します。周りからは見られません

- /panel get  
ステータスパネルのあるチャンネルを表示します

- /panel set  
ステータスパネルを表示するチャンネルを設定します

- /panel delete  
ステータスパネルを削除します

## ループバック接続の許可
同じPC内で通信をするには設定が必要になる場合があります。  
こちらのコマンドをコマンドプロンプトで**管理者権限**で実行してください  
`CheckNetIsolation.exe LoopbackExempt –a –p=S-1-15-2-1958404141-86561845-1752920682-3514627264-368642714-62675701-733520436;`  
または `loopback.cmd` を実行してください(同じコマンドが入っています)

## Config
(必須)  
- `discord_token`: botのトークン  
- `guild_id`: このbotを使うサーバー(Guild)のID  
- `channel_id`: メッセージを送信するチャンネルのID  

(任意)  
- `port`: websocket接続に使用するポート
- `language`: 使用する言語 langフォルダのファイル名
- `timezone`: 時刻表示に使うタイムゾーン
- `command_role_id`: マイクラへのコマンドの送信を許可するロールのID  
文字の配列で指定します (EX: `[ "ロールID1", "ロールID2",... ]`)
- `ready_message`: サーバー起動時に通知メッセージを送信
- `delete_color_prefix`: discord送信時に§とその後の文字を削除するか
- `scripts_entry`: 実行するスクリプトのエントリポイント
- `command_version`: マイクラに送るコマンドのバージョン
- `debug`: デバッグログを有効化
- `styles_tnac`: TN-AntiCheatからのメッセージを強調する

## メッセージのカスタマイズ
lang/[言語名].langでメッセージのテンプレートを編集できます

## Contributing & Translation
改善点、問題点などのPull RequestやIssueは大歓迎です！  
このBotは複数言語に対応しています。翻訳ファイル(`lang/*.lang`, `src/interactions/_localizations.json`)を編集することで他の言語に対応させることができます。  
※後者のlocalizationの言語のキーは[DiscordAPIのもの](https://discord.com/developers/docs/reference#locales)に従ってください