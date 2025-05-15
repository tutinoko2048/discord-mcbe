# spec
## ディレクトリ構成
- `projects/`
  - `server/` サーバーとDiscord bot
  - `addon/` BDS連携用のアドオン
- `packages/`
  - `client/` アドオンで使うクライアント(配布可能)
  - `shared/` 共有するコードを置く

## メモ
- tools
  - pnpm (pm + workspace)
  - bun (for CLI tool)
  - rolldown
  - turborepo
- NodeJSで鯖を立てる
  - bunは暗号化の一部機能が未実装のため使えない(無効化すれば可)
- BDSの場合: script-bridge経由でアドオンと通信する
- 普通のワールドの場合: websocket経由でアドオンと通信する
- scripts, langはそのままルートに置く