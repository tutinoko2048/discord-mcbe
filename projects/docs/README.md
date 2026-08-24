# discord-mcbe documentation

AstroとStarlightで構築した、discord-mcbeの日本語・英語ドキュメントです。

## 開発

リポジトリのルートで依存関係をインストールし、次のコマンドを実行します。

```bash
pnpm --filter @discord-mcbe/docs dev
```

本番ビルドではAstroサイトに続いてTypeDocのAPIリファレンスも生成されます。

```bash
pnpm --filter @discord-mcbe/docs build
```

コンテンツは`src/content/docs`にあり、ルート直下が日本語、`en/`以下が英語です。

## デプロイ

`main`または`rewrite`ブランチへのpushとGitHub Releaseの公開時に、`.github/workflows/deploy-docs.yml`がCloudflare Workersへデプロイします。リリース時はタグをcheckoutするため、ランチャーとアドオンのダウンロードリンクが、そのリリース時点の`package.json`に記載されたバージョンへ更新されます。

GitHub Actionsには`CLOUDFLARE_ACCOUNT_ID`と`CLOUDFLARE_API_TOKEN`のRepository secretsが必要です。workflowは手動実行にも対応しています。
