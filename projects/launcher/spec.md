# 構造

## win

- `run.bat`
- `updater.exe`

## linux/macos

- `run.sh`
- `updater`

## 共通

- `scripts/` (カスタムスクリプト)
- `app/` (本体)

# updater

- bun executable
- `updater` アプデ実行
- `updater --dry-run`
- `updater --help` `-h` ヘルプ表示
- `updater --version` `-v` updaterのバージョン表示
- アップデート方法
  - バージョン取得
    - GitHub Releases API からリリース一覧を取得する。
    - ランチャー自体のリリースと混同しないよう、タグ名が `launcher@v` 等で始まらない（本体のバージョン `vX.X.X`）ものを対象にフィルタリングし、最新の `tag_name` などからバージョンとアセットURLを特定する。
    - リリースアセットから `metadata.json` を取得して `minimumLauncherVersion` (連番) をチェックし、updater自体が古くないか確認する。
  - アップデート処理
    - GitHub Releases から対象バージョンのアーカイブ (`discord-mcbe-vX.X.X.tar.gz`) をダウンロードし、`Bun.Archive` を用いて `app/` フォルダへ展開する
      - アーカイブ内には `discord-mcbe.js`, depsを更新した `package.json`, `.VERSION`
    - ランタイム内包のBun (`updater` を兼ねる) を使い、`app/` フォルダ内で `bun install` を実行。これにより `app/node_modules/` に本体機能がインストールされる (ユーザーのローカル環境のNode.jsやPMには依存しない)
    - ユーザーが `scripts/` ディレクトリ等から `@discord-mcbe/*` の型補完を効かせられるよう、ルートディレクトリの `tsconfig.json` に `paths` (`"@discord-mcbe/*": ["./app/node_modules/@discord-mcbe/*"]`) を事前に差し込んでおく

# run

- appフォルダがなければupdaterを走らせる
- updater `app/discord-mcbe.js` を起動する
  - ランタイムは`BUN_BE_BUN=1`にしてupdaterを実行する
  - sh: `BUN_BE_BUN=1 ./updater run --bun start`
  - bat: `set BUN_BE_BUN=1 && updater run --bun start`

# 実装

- commanderを使う
- repo: `tutinoko2048/discord-mcbe`

# TODO

- [x] `version.ts`: GitHub Releases API を使用した実際のリリース取得処理の実装（`launcher@v*` タグの除外、アセットURLのパース）
- [ ] `version.ts`: アセットから `metadata.json` をフェッチし、`minimumLauncherVersion` を検証するロジックの実装
- [ ] `install.ts`: 対象のアセットURL (.tar.gz) からファイルをダウンロードし、`Bun.Archive` を使い `app/` へ展開する処理の連携
- [ ] `install.ts`: 展開後、`app/` ディレクトリ内で `bun install` を実行する処理の整備
- [ ] `run.bat` / `run.sh`: `app` フォルダが存在しない場合に `updater` を自動起動し、その後 `BUN_BE_BUN=1` で本体を起動するスクリプトの整備
- [x] (仕組み化) GitHub Actionsで `discord-mcbe-*.tar.gz` (本体・環境一式) と `metadata.json` を生成してリリースに上げるCI/CDの整備
