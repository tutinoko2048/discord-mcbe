# 構造
## win
- `run.bat`
- `updater.exe`

## linux/macos
- `run.sh`
- `updater`

## 共通
- `scripts/` (カスタムスクリプト)
- `lang/` (言語ファイル)
- `app/` (本体)

# updater
- bun executable
- `updater check` 最新バージョンを返す: `{ "current": string, "latest": string }`
- `updater` アプデ実行
- `updater --dry-run`
- `updater --help` `-h` ヘルプ表示
- `updater --version` `-v` updaterのバージョン表示
- アップデート方法 (検討中)
  - GH Release経由で`package.json`とかいろいろ入ったzipを落として展開
  - `app/*`を置き換え
  - npm経由で本体のインストール(`app/node_modules/*`)
  - 問題: `scripts`からapp/node_modules/*の補完を効かせる方法

# run
- appフォルダがなければupdaterを走らせる
- updater `app/discord-mcbe.js` を起動する
  - ランタイムは`BUN_BE_BUN=1`にしてupdaterを実行する
  - sh: `BUN_BE_BUN=1 ./updater run --bun start`
  - bat: `set BUN_BE_BUN=1 && updater run --bun start`

# 実装
- commanderを使う
- repo: `tutinoko2048/discord-mcbe`
