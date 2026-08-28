日本語 | [English](https://discord-mcbe.tn2048.workers.dev/en/installation/setup-bot/)

このガイドはdiscord-mcbe v4正式版向けです。詳しい手順は[公式ドキュメント](https://discord-mcbe.tn2048.workers.dev/installation/setup-bot/)を参照してください。v3から移行する場合は、既存環境をバックアップして別のフォルダーへセットアップし、設定を作り直してください。v3用アドオンとv4サーバーには互換性がありません。

- [導入方法](#導入方法)
  - [1. Discord Botの準備](#1-discord-botの準備)
  - [2. discord-mcbeサーバーの準備](#2-discord-mcbeサーバーの準備)
  - [3. Minecraft側の準備](#3-minecraft側の準備)
    - [ローカル(通常)ワールドの場合](#ローカル通常ワールドの場合)
    - [BDSのワールドの場合](#bdsのワールドの場合)
- [アップデート方法](#アップデート方法)

# 導入方法

## 1. Discord Botの準備

[Discord Developer Portal](https://discord.com/developers/applications) で新規アプリケーションを作成し、Botの準備を行う

- `Bot` → `Privileged Gateway Intents` → **`Message Content Intent`** を有効にする
- `トークンをリセット` をクリックしてBOTトークンを控えておく
- `OAuth2` → `OAuth2 URLジェネレーター`に進み、スコープの`bot`と`applications.commands`にチェックを入れる
  - 以下の権限を選択する
    - 必須:
      - `チャンネルを表示`
      - `メッセージを送る`
      - `リンクを埋め込み`
      - `ファイルを添付`
      - `メッセージ履歴を読む`
    - 推奨:
      - `低速モードを回避`
  - 連携タイプ: `ギルドのインストール`
  - 生成されたURLにアクセスし、Botをサーバーに招待する

## 2. discord-mcbeサーバーの準備

- [リリースページ](https://github.com/tutinoko2048/discord-mcbe/releases) から最新の discord-mcbe launcher をダウンロードして展開する
- `.env` ファイルに必要な環境変数を設定する

| 環境変数            |      | 説明                                                      |
| ------------------- | ---- | --------------------------------------------------------- |
| **`DISCORD_TOKEN`** | 必須 | Bot作成時に控えたトークン                                 |
| **`GUILD_ID`**      | 必須 | Botを招待したサーバー(Guild)のID                          |
| **`CHANNEL_ID`**    | 必須 | Botがメッセージを送るチャンネルのID                       |
| (`SOCKET_PORT`)     | 任意 | ローカル(通常の)ワールドとのWebSocket通信に使用するポート |
| (`BRIDGE_PORT`)     | 任意 | Bedrock Dedicated Serverとの通信に使用するポート          |

- Windowsでは`.\updater.exe latest`で正式版をインストールし、`.\start.bat`で起動する
- Linux / macOSでは`chmod +x updater start.sh`を実行し、`./updater latest`でインストールしてから`./start.sh`で起動する

## 3. Minecraft側の準備

- [リリースページ](https://github.com/tutinoko2048/discord-mcbe/releases) からサーバーと同じリリースのアドオンをダウンロードし、ワールドに導入する。通常のワールドには`local`、BDSには`bds`アセットを使用する
- v4正式版でもMinecraftのBeta APIsを使用するため、必要な実験的機能を有効にする。詳細は[ワールドのセットアップ](https://discord-mcbe.tn2048.workers.dev/installation/setup-world/)を参照する

### ローカル(通常)ワールドの場合

- discord-mcbeのターミナルに出力されるコマンド (ex: `/connect localhost:3063`) をマイクラで実行する

### BDSのワールドの場合

- 自動で接続されます

# アップデート方法

discord-mcbe launcherには簡単に本体のアップデートを行えるCLIアップデートツールが同梱されています。

- サーバーを停止し、更新前の環境をバックアップする
- Windowsでは`.\updater.exe latest`、Linux / macOSでは`./updater latest`を実行する
- v4ベータ版から正式版へ移行する場合は、上記コマンドに`--force`を追加する
- アドオンもサーバーと同じリリースへ更新してから起動する

<div align="right">
  <a href="../README_ja.md">トップに戻る</a>
</div>
