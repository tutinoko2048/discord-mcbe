# App / Launcher リリース手順

annotated tagをpushするとリリースが開始され、GitHub ReleaseのDraftが作成されます。CIは次を検証します。

- tag名とpackage versionが一致する
- annotated tagである
- 正式版Appのtagが`main`上にある

正式版Appは`main`から公開します。ベータ版AppとLauncherは任意のブランチから公開できます。

```bash
git switch <branch-name>
git pull --ff-only
pnpm install --frozen-lockfile
```

## App

AppのversionはSemVerを使用します。ベータ版は`X.Y.Z-beta.N`、正式版は`X.Y.Z`です。

### 1. version更新と確認

```bash
# どちらか一方を実行
pnpm run bump-version app 4.0.0-beta.5
pnpm run bump-version app 4.0.0

pnpm build
pnpm check
pnpm --filter @discord-mcbe/launcher test
```

新しいLauncherが必須の場合は、先にLauncherを公開し、その整数versionを`packages/shared/src/constants/common.ts`の`MINIMUM_LAUNCHER_VERSION`へ設定します。

### 2. commit、tag、push

version変更をコミットし、同じコミットへtagを作成します。正式版は`main`、ベータ版は現在のブランチを一緒にpushします。

```bash
# ベータ版の例
git tag -a v4.0.0-beta.5 -m "discord-mcbe v4.0.0-beta.5"
git push origin <branch> --tags

# 正式版の例
git tag -a v4.0.0 -m "discord-mcbe v4.0.0"
git push origin main --tags
```

例はどちらか一方だけ実行してください。`v*`のtag pushで`Release App`が起動します。

### 3. Draft確認

- ベータ版はPrerelease、正式版は通常リリースになっている
- npm、Launcher用アセット、BDS／ローカル用アドオンが揃っている
- versionとtagが一致している

問題がなければDraftを公開します。npm dist-tagはベータ版が`beta`、正式版が`latest`です。

## Launcher

LauncherのversionはSemVerではなく、`0`以上の単一整数です。

### 1. version更新と確認

```bash
pnpm run bump-version launcher increment
pnpm --filter @discord-mcbe/launcher check
pnpm --filter @discord-mcbe/launcher test
pnpm --filter @discord-mcbe/launcher compile
```

### 2. commit、tag、push

version変更を現在のブランチへコミットし、同じコミットへtagを作成します。

```bash
git tag -a launcher@v3 -m "discord-mcbe launcher v3"
git push origin <branch> --tags
```

`launcher@v*`のtag pushで`Release Launcher`が起動します。

### 3. Draft確認

- Windows、Linux、macOS向けの5つのzipが揃っている
- zip直下にupdater、起動スクリプト、`.env`、`package.json`、`scripts/`がある
- Windowsでは`updater.exe`をダブルクリックして起動できる

問題がなければDraftを公開します。

## 両方リリースする場合

新しいLauncherが必要なAppは、次の順で公開します。

1. Launcherをリリース
2. `MINIMUM_LAUNCHER_VERSION`を更新
3. Appをリリース

## 失敗した場合

push済みのtagは移動・上書きしません。コード修正が必要ならversionを更新し、新しいtagを作成します。

- 一時的なCI失敗: 同じworkflow runを再実行する
- Appのnpm公開後の失敗: 同じversionを再公開できないため、公開状況を確認してから対応する
- LauncherのDraft作成後の失敗: 既存Draftとアセットを確認し、重複作成を避ける
