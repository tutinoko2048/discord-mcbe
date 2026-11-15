# チャット連携機能 実装計画

チャットを自前で処理するアドオン（MakeCountry など）と discord-mcbe を連携させるための計画です。

## 背景

- discord-mcbe は Minecraft のチャットを `world.afterEvents.chatSend` だけで受け取っている（`packages/client/src/client/event.ts`）。
- MakeCountry は `world.beforeEvents.chatSend` で全チャットを cancel し、国名などを付けて `player.sendMessage()` で送り直す。このため `afterEvents.chatSend` が発火せず、チャットが Discord にもコンソールにも出ない。
- 既存の連携機能 `dmc:send_message` は Discord へ直接送るだけで、コンソールログ、Webhook、アバター、`strip_color_prefix`、複数ワールド表示を通らない。
- MakeCountry作者から公式対応の了承を得ている。ForkしてPR出す予定。

## 方針

- MakeCountry 専用にせず、チャットを自前で処理するアドオン全般が使える仕組みにする。
- アドオンから受け取ったチャットは、通常のチャットと同じ処理経路（`ActionId.ChatSend`）に流す。
- 通信は既存の連携機能と同じく MCBE-IPC を使う。
- ペイロードは JSON 文字列（`PROTO.String`）にする。両プロジェクトは別々にリリースされるので、知らないフィールドは無視し、`protocol` 番号で互換性を管理する。
- 有効・無効は既存の `bot.allow_addon_messages` に従う。チャット連携専用の設定は作らない。
- 登録やチャット通知の処理（検証、プレイヤーの確認、`ChatSend` の通知）は、`AddonIntegration` クラス（`features/addon-integration.ts`）にまとめる。処理本体はデコード済みのペイロードを受け取るメソッドにして、MCBE-IPC に依存させない。MCBE-IPC のチャンネルとつなぐ部分は、同じクラスの `registerIpc` と接続通知に閉じ込める。あとで `@bedrock-core/sync` からも同じ処理を呼べるようにするため（「後続: `@bedrock-core/sync` への対応」）。
- アドオン向けのペイロードのスキーマ（valibot）、チャンネル名、機能名は `@discord-mcbe/shared` に置く。npm で公開しているパッケージなので、外部のアドオンも型と検証を再利用できる。スキーマは `v.object` で書き、知らないフィールドは無視する。不正な値が1つでもあれば、そのペイロード全体を捨てる。

## フェーズ1: Minecraft → Discord

### 1. 登録 `dmc:register`（invoke）

アドオンが起動時に一度だけ呼ぶ。20tick 以内に応答がなければ discord-mcbe は導入されていない。

```ts
// request（JSON 文字列）
{ source: 'makecountry', protocol: 1, features: ['minecraft_chat'] }

// response（JSON 文字列）
{ protocol: 1, connected: boolean, features: ['minecraft_chat'] }
```

応答の `features` には、要求された機能のうち discord-mcbe が受け付けたものを入れる。知らない機能（今は `discord_chat` など）や不正な要求では空になる。アドオンはこれを見て、機能が使えるかを判断できる。

| feature          | 意味                                                                      | フェーズ |
| ---------------- | ------------------------------------------------------------------------- | -------- |
| `minecraft_chat` | Minecraft のチャットをこのアドオンが処理し、`dmc:on_chat_send` で通知する | 1        |
| `discord_chat`   | Discord から来たチャットの表示をこのアドオンが担当する                    | 2        |

`minecraft_chat` が登録されていて、かつサーバーの `allow_addon_messages` が `true` の間、discord-mcbe は自前の `afterEvents.chatSend` による中継を止める。チャットを cancel しないアドオンが登録した場合の二重送信を防ぐため。サーバーの設定は接続時に受け取る（「5. サーバー設定の同期」）。

登録されたアドオン名は起動ログに出す。

登録はスクリプトのメモリ上にだけ持つ。`/reload` は全アドオンを再読み込みするので、アドオン側の起動時の登録がもう一度走る。再登録のための通知は用意しない。

### 2. チャット通知 `dmc:on_chat_send`（send）

```ts
{
  source: 'makecountry',
  playerId: string,      // Player.id
  message: string,       // 装飾を含めない本文
  formatting?: {         // 「3. チャットの装飾」
    namePrefix?: string,
    nameSuffix?: string,
    messagePrefix?: string,
    messageSuffix?: string,
  },
}
```

discord-mcbe クライアント側の処理:

1. 未接続（`bridge.isConnected === false`）なら捨てる。
2. JSON を検証する。不正なら捨てる。
3. `source` が `minecraft_chat` を登録済みか確かめる。未登録なら捨てる。登録なしで通知を受けると、自前の中継が止まらず二重送信になるため。
4. `world.getEntity(playerId)` がオンラインの `Player` か確かめる。違えば捨てる。
5. `ActionId.ChatSend` として通知する。

アドオン側は接続状態を気にせず送ってよい。どのチャットを Discord に出すか（全体チャットだけ、など）はアドオン側が決める。

### 3. チャットの装飾

装飾は 26.70 で入るプロトコルの `ChatFormatting`（「7. Managed Chat への備え」）と同じ4項目にする。名前は Script API に合わせて `Suffix` を使う。

| フィールド      | 表示位置     | Script API                 | プロトコル（26.70） |
| --------------- | ------------ | -------------------------- | ------------------- |
| `namePrefix`    | 送信者名の前 | `Player.chatNamePrefix`    | `NamePrefix`        |
| `nameSuffix`    | 送信者名の後 | `Player.chatNameSuffix`    | `NamePostfix`       |
| `messagePrefix` | 本文の前     | `Player.chatMessagePrefix` | `MessagePrefix`     |
| `messageSuffix` | 本文の後     | なし（未公開）             | `MessagePostfix`    |

- 表示名は `namePrefix + name + nameSuffix`、表示する本文は `messagePrefix + message + messageSuffix`。
- `ChatSendPacket` に任意フィールド `formatting`（上の4項目を持つオブジェクト、各項目も任意）と `source` を追加する。`message` には装飾を含めない生の本文を入れ、サーバーが表示のときにつなげる。
- 通常のチャット（`afterEvents.chatSend`）では、クライアントが `player.chatNamePrefix` / `chatNameSuffix` を読んで `formatting` に入れる。beta API なので、値がない場合は省略する。
- 通常のチャットでは `messagePrefix` を送らない。1.26.63 では `chatSend` イベントの `message` に `chatMessagePrefix` がすでに含まれている（「検証結果」）ので、`message` をそのまま送れば Discord にも prefix が出る。クライアントで prefix を取り除いて別フィールドにする方法は採らない。今後 `message` に prefix が含まれなくなった場合に、プレイヤーが打った文字を誤って削るおそれがあるため。この結果、通常のチャットで prefix が設定されているときは、サーバーは prefix 抜きの本文を取り出せない。
- 26.70 で `message` に prefix が含まれなくなった場合は、そのときにクライアントが `chatMessagePrefix` を `formatting.messagePrefix` に入れるよう対応する。対応するまでは Discord 側で prefix が出なくなるだけで、本文は欠けない。
- `messageSuffix` は Script API に対応するプロパティがないので、通常のチャットでは入れない。追加されたらクライアントで読むだけで対応でき、プロトコルの変更は要らない。
- `messagePrefix` / `messageSuffix` は、今のところ `dmc:on_chat_send` でアドオンが渡した場合にだけ使われる。
- `dmc:on_chat_send` で `formatting` やその項目が省略された場合は、装飾なしとして扱う。プレイヤーのプロパティは自動では読まない。チャットを自前で表示するアドオンは標準のチャット表示を置き換えているので、ゲーム内でこれらの値が表示されているとは限らないため。標準の値を使いたいアドオンは `player.chatNamePrefix` などを自分で渡す。`beforeEvents.chatSend` の `message` にも `chatMessagePrefix` が含まれるので、それをそのまま `message` として送る場合は `messagePrefix` を付けない。
- 値はプレーンな文字列だけを受け付ける。RawMessage（`translate` など）は discord-mcbe 側で解決できないので、アドオン側で文字列にしてから送る。
- 表示名を使う場所: コンソールログ、Webhook の username、Webhook を使わないときの Discord のメッセージ。
- コンソールログと Discord のメッセージでは、名前と装飾を別々のプレースホルダーとして翻訳テンプレートに渡す。`translation_overrides` で装飾の位置を変えられる。
  - `discord.chat`: `%0` 装飾付きの名前、`%1` 本文、`%2` 装飾なしの名前、`%3` 名前の prefix、`%4` 名前の suffix。
  - `discord.chat.multipleWorlds` と `console.chat`: 先頭の `%0` がワールド名で、以降は1つずつ後ろにずれる。
  - `%0` と `%1`（ずれる側では `%1` と `%2`）の意味は変えない。すでにテンプレートを上書きしている設定が、装飾付きのまま動き続ける。
  - 既定のテンプレートは `<%3%2%4> %1`。装飾は `<>` の中に出す（例: `<[日本] Steve ★> hello`）。今までの表示と同じで、`chatNamePrefix` を使ったときのゲーム内の並びとも一致する。装飾がなければ `<Steve> hello` になる。
  - prefix を `<>` の外に出したい場合は `"discord.chat": "%3<%2%4> %1"` と上書きする（例: `[日本] <Steve ★> hello`）。MakeCountry の国名タグはこの並びのほうが読みやすいので、MakeCountry への PR の説明でこの上書きを案内する。
  - 外に出す並びを既定にしなかった理由: 標準の装飾を使うサーバーでゲーム内と並びが変わること、MakeCountry のサポーターの印（prefix の末尾の `★`）が `★<Steve>` と名前から離れること、prefix の末尾に空白がないと `[VIP]<Steve>` と詰まって見えること。
  - 本文の prefix / suffix は分けて渡さない。位置を変える用途が見当たらないため。
  - Webhook の username には `<>` がないので、装飾付きの名前をそのまま使う。
- テンプレートの置き換えは1回の走査で行う。値を順番に置き換える方式だと、チャット本文に含まれる `%2` などが別の値に置き換わり、`- 表示名を使う場所: コンソールログ、Webhook の username、Webhook を使わないときの `<名前> メッセージ` 形式。` などが `String.prototype.replace` に解釈されて表示が崩れるため。
- アバター URL の `{name}` には装飾なしの名前を使う。
- 装飾の `§` は `strip_color_prefix` に従って消す。Webhook の username は 80 文字で切る（既存の処理）。
- `MinecraftMessageEvent` に `formatting` と `source` を追加し、サーバー側スクリプトから参照できるようにする。`message` は生の本文のままにする。

MakeCountry での `formatting` の割り当ては「作業項目」の MakeCountry の節に書く。

MakeCountry は装飾をメッセージごとに国データから組み立てていて、`player.chatNamePrefix` は設定していない。チャットを cancel しているので、設定してもゲーム内には表示されない。このため、ペイロードで明示的に渡す形が合う。

### 4. 有効・無効

`bot.allow_addon_messages` が `false` のときの動作:

- サーバーは `source` 付きの `ChatSend` を捨てる。捨てたときは、原因が分かるように `source` ごとに一度だけ警告ログを出す。判定とログはサーバーだけで行い、クライアントは `dmc:on_chat_send` をそのまま転送する。
- クライアントは `minecraft_chat` の登録を無視して、自前の `afterEvents.chatSend` による中継を続ける。チャットを cancel しないアドオンなら、装飾なしの通常のチャットとして Discord に流れる。
- MakeCountry のように全チャットを cancel するアドオンでは、チャットは流れない。設定で連携を切っているので、これは意図どおりの動作とする。

### 5. サーバー設定の同期

クライアントが自前の中継を止めるかどうかを決めるには、サーバーの `allow_addon_messages` を知る必要がある。接続直後にクライアントが送る `WorldInitialize` の応答で設定を返す。

```ts
// WorldInitialize の response（現在は null）
{
  settings: {
    allowAddonMessages: boolean;
  }
}
```

- `WorldInitialize` は server-net と WebSocket の両方で接続直後に必ず送られるので、トランスポートごとの接続処理（`ConnectPacket`、`dmc:__connect__`）には手を入れない。
- クライアントは受け取った設定を保持し、切断時に破棄する。設定を受け取るまでは「未受信」として扱い、自前の中継を止めない。
- サーバーの設定は起動中に変わらないので、同期は接続時の一度だけでよい。
- `settings` はオブジェクトにしておき、今後クライアントに渡したい設定が増えたらここに足す。

### 6. プロトコルバージョン

`ChatSendPacket` へのフィールド追加と `WorldInitialize` の応答変更は、どちらも `v.strictObject` の検証に引っかかる。`WEBSOCKET_BRIDGE_PROTOCOL_VERSION` と `SERVER_NET_BRIDGE_PROTOCOL_VERSION` を 2 から 3 に上げる。

バージョンが合わない組み合わせは、既存の `OutdatedClient` / `OutdatedServer` の処理で接続時に弾かれる。リリースノートに「アドオンとサーバーを同時に更新する必要がある」と書く。

### 7. Managed Chat への備え

26.70 で Managed Chat が入る見込み（参考: [Sandertv/gophertunnel#534](https://github.com/Sandertv/gophertunnel/pull/534)。PR は作業中で、最新プレビューでもまだ使われていないと書かれている）。プロトコル定義から分かることは次のとおり。

- 新しい `Chat` パケットが追加される。本文は Mojang の Chat Service が署名し、サーバーは署名付きの内容を変更せずに中継する。受信側のクライアントが署名を検証する。
- 署名付きの内容には、検査された本文（`ScanText`）と、伏せ字にされた本文（`RedactedText`、伏せる箇所がなければ空）が含まれる。
- サーバーが付けられる装飾は `ChatFormatting` の4項目（`NamePrefix` / `NamePostfix` / `MessagePrefix` / `MessagePostfix`）だけで、署名の対象外。
- サーバーごとに有効・無効がある（`ManagedChatEnabled`）。

この計画への影響:

- 本文をサーバー側で書き換えられないので、名前や本文を飾るには `ChatFormatting`（Script API では `chatNamePrefix` など）を使うことになる。装飾を4項目の `formatting` として持つ設計は、これにそのまま対応する。
- チャットを cancel して `sendMessage` で送り直す方式のアドオンが、標準のチャット + `chatNamePrefix` に移行した場合、`afterEvents.chatSend` が発火するようになる。そのときは通常のチャットの経路だけで装飾付きのチャットが Discord に流れ、`dmc:on_chat_send` は不要になる。両方の経路が同じ `formatting` を使うので、移行してもサーバー側の処理は変わらない。
- 国チャットのように宛先を絞るチャットは、cancel + 送り直しの方式が残ると考えられる。`dmc:on_chat_send` はそのために引き続き必要。

## フェーズ2: Discord → Minecraft（任意）

現在は Discord のメッセージを `world.sendMessage` で全員に送っている。このため、MakeCountry の全体チャットミュート（`isMuteGeneralChat`）やミュートリストが効かない。

`discord_chat` を登録したアドオンには、discord-mcbe が送信者名と本文を IPC で渡し、表示をアドオンに任せる。サーバー側で「Discord チャットの中継」と「それ以外の SendMessage」を区別する必要がある。チャンネル名とペイロードはフェーズ1の完了後に決める。

## 後続: `@bedrock-core/sync` への対応

[`@bedrock-core/sync`](https://github.com/bedrock-core/server/tree/main/packages/sync) は、scriptevent の上にメッセージバス、ピアの発見、RPC、イベント、共有状態を載せたアドオン間通信のパッケージ。フェーズ1のあとに、MCBE-IPC と並ぶもう1つの入口として対応する。

フェーズ1を先にする理由:

- MakeCountry との連携を MCBE-IPC で先に実装して、実機で確認できている。計画を立てた時点の MakeCountry（2.4.1）にはバンドラーがなく、TypeScript のソースで配布される `@bedrock-core/sync` は組み込みにくかった。2.5.1 で tsdown が入ったので、この制約はなくなっている。
- `@bedrock-core/sync` は 2026年8月の公開から3か月で 0.1 → 2.0 と破壊的変更が続いている。対応を後にしたほうが、追従の手間が少ない。
- フェーズ1でペイロード（登録、チャット通知、`formatting`）が JSON のオブジェクトとして固まる。`@bedrock-core/sync` 側は同じ処理を別の入口から呼ぶだけになる。

対応の想定（詳細はフェーズ1のあとに決める）:

| MCBE-IPC                                                 | `@bedrock-core/sync`                                     |
| -------------------------------------------------------- | -------------------------------------------------------- |
| `dmc:ping`                                               | ピアの発見（`discovery.peers` に discord-mcbe が現れる） |
| `dmc:register` / `dmc:on_chat_send` / `dmc:send_message` | discord-mcbe 宛ての RPC                                  |
| `dmc:connect` / `dmc:disconnect`                         | 共有状態かイベント                                       |

決まっていること:

- ノードは常時起動する。他に対応アドオンがなくても 100tick ごとの生存通知などが動くが、問題ないものとする。有効・無効の設定は作らない。
- バンドルサイズの増加は許容する。

## 作業項目

### discord-mcbe

- [x] `packages/shared/src/constants/common.ts`: ブリッジのプロトコルバージョンを 3 に上げる
- [x] `packages/shared/src/packets/chat-send.ts`: `formatting`（4項目）と `source` を任意フィールドとして追加
- [x] `packages/shared/src/addon/`、`packages/shared/src/enums/addon.ts`: アドオン向けペイロードのスキーマと検証関数、`AddonChannel` / `AddonFeature`
- [x] `packages/shared/src/packets/world-initialize.ts`: 応答を `{ settings: { allowAddonMessages } }` に変更
- [x] `packages/client/src/client/base-client.ts`: `WorldInitialize` の応答から設定を保持し、切断時に破棄する
- [x] `packages/client/src/client/features/addon-integration.ts`: 登録・チャット通知・メッセージ送信の処理と、MCBE-IPC のチャンネル（`dmc:register` / `dmc:on_chat_send` を追加）。`features/ipc.ts` はここに統合して削除
- [x] `packages/client/src/client/event.ts`: `chatNamePrefix` / `chatNameSuffix` を `formatting` に入れて送る。`message` はそのまま送る。`minecraft_chat` 登録中かつ `allowAddonMessages` が `true` のときは中継を止める
- [x] `projects/server/src/minecraft/minecraft.ts`: `WorldInitialize` で設定を返す（`handlePacket` の戻り値の型を広げる）。`source` 付き `ChatSend` を `allow_addon_messages` で判定し、捨てたら警告ログを出す
- [x] `projects/server/src/minecraft/bridge/world.ts`、`projects/server/src/events/minecraft-message.ts`: 装飾と `source` をイベントに渡す
- [x] `projects/server/src/handlers/event.ts`、`projects/server/src/discord/minecraft-chat-webhook.ts`: `formatting` から表示名と表示する本文を組み立てる。テストを更新
- [x] `projects/docs/src/content/docs/guides/addon-integration.mdx`（日本語・英語）: 登録とチャット通知の説明を追加
- [x] `allow_addon_messages` の説明文を「チャット連携も対象」と分かるように更新
- [x] `projects/server/src/util/i18n.ts`: テンプレートの置き換えを1回の走査にする
- [x] `projects/server/src/assets/locales/*.json`、`projects/server/src/handlers/event.ts`: 名前と装飾を別々のプレースホルダーで渡し、既定の表示を `[装飾] <名前> 本文` にする
- [x] `projects/docs/src/content/docs/guides/translation-overrides.mdx`（日本語・英語）: チャットのプレースホルダーの説明を追加

### MakeCountry

2.5.1（`1c1add7d`、2026-11-16）のソースを前提にする。Fork して PR を出す。

2.4.1 から変わった点で、この計画に関係するもの:

- tsdown でバンドルするようになった（`npm run build` → `scripts/index.js`）。`mcbe-ipc` は npm の依存として追加でき、ソースを同梱する必要がなくなった。配布パックの `scripts/plugins/register.js` を書き換える導入方法は使えなくなった。
- チャット種別に `direct` が増えた（`event.targets` があるとき。DM）。
- 全体チャットの表示が `[§{色}国名§r/§9連邦名§r|ペンネーム§r] §7{サポーターの印}名前§f: {発言色}本文` になった。サポーターの印（`★`）と発言色が増えている。
- チャットの配信が `sendChatBatch` 経由になった。配布版では原文をそのまま配信する。

作業項目（フォーク `tutinoko2048/MakeCountry` の `feat/discord-mcbe-integration` ブランチで実装済み。未コミット、ゲーム内では未確認）:

- [x] `package.json` に `mcbe-ipc`（`^3.4.2`）を追加する。
- [x] `tsdown.config.js` に `noExternal: ['mcbe-ipc']` と `inlineOnly: ['mcbe-ipc']` を追加する。tsdown は `dependencies` のパッケージをバンドルに含めないので、指定しないと `import ... from "mcbe-ipc"` がそのまま残り、ゲーム内で読み込めない。
- [x] `src/features/discord-mcbe/index.ts` を追加する。ワールド読み込み時に `dmc:register` を呼び、チャットを通知する関数 `notifyDiscordChat` を export する。`chat-router.ts` が import するので、`bootstrap.ts` への追加は要らない。
- [x] `src/domain/chat/chat-router.ts` の `general` の分岐で `notifyDiscordChat` を呼ぶ。
- [x] `src/config/server.ts` に `discordMcbeIntegration`（連携の有効・無効、既定は有効）と `discordNoCountryName`（国に未所属のときの国名、既定は `無所属`）を追加する。
- [x] `docs/admin.md` に連携の説明を1行追加する。
- [x] `npm run typecheck` と `npm run build` が通り、`scripts/index.js` に `mcbe-ipc` が含まれていること（外部 import が `@minecraft/*` だけであること）を確かめる。
- [ ] ゲーム内で discord-mcbe と一緒に動かして確認する。
- [ ] upstream（`karonyt/MakeCountry`）へ PR を出す。

通知を `playerHandler.afterEvents.chat` の購読ではなく `chat-router.ts` の中から行う理由:

- `afterEvents.chat` のペイロードは `{ player, message, type }` だけで、国名・連邦名・ペンネーム・サポーターの印を持っていない。これらは `ChatHandler.handleChat` のローカル変数なので、購読側で装飾を組み立てるには同じ計算をもう一度書くことになる。
- `general` の分岐の中なら、表示に使っている値をそのまま `formatting` に渡せる。連投制限や `beforeEvents.chat` の cancel を通過したあとなので、通知してよいチャットだけが来る。

`formatting` の割り当て:

| フィールド                     | 入れる値                                |
| ------------------------------ | --------------------------------------- |
| `namePrefix`                   | `[§{色}国名§r/§9連邦名§r                | ペンネーム§r] §7{サポーターの印}` |
| `messagePrefix`                | 送信者の発言色（`§f` 以外のとき）。任意 |
| `nameSuffix` / `messageSuffix` | 使わない                                |

- 国に所属していないときの国名は、ゲーム内では翻訳キー（`chat.player.no.join.any.country`）で表示している。翻訳はクライアント側で行われ、スクリプトからは文字列にできない。Discord 向けには設定 `discordNoCountryName` の文字列を使う。
- 発言色は読む側の設定（`hideChatColors`）で消せるが、Discord 向けには送信者の色をそのまま渡す。discord-mcbe の `strip_color_prefix` が有効なら消える。
- `message` には `this.message`（`beforeEvents.chatSend` の `message`）をそのまま渡す。

```ts
// src/features/discord-mcbe/index.ts（概略）
import { system, world, type Player } from '@minecraft/server';
import { IPC, PROTO } from 'mcbe-ipc';

const SOURCE = 'makecountry';

let registered = false;

world.afterEvents.worldLoad.subscribe(async () => {
  const response = await Promise.race([
    IPC.invoke(
      'dmc:register',
      PROTO.String,
      JSON.stringify({ source: SOURCE, protocol: 1, features: ['minecraft_chat'] }),
      PROTO.String,
    ),
    system.waitTicks(20).then(() => undefined),
  ]);
  if (response === undefined) return;

  const { features } = JSON.parse(response) as { features?: string[] };
  registered = features?.includes('minecraft_chat') ?? false;
});

export function notifyDiscordChat(
  sender: Player,
  message: string,
  formatting: { namePrefix?: string; messagePrefix?: string },
): void {
  if (!registered) return;

  IPC.send(
    'dmc:on_chat_send',
    PROTO.String,
    JSON.stringify({ source: SOURCE, playerId: sender.id, message, formatting }),
  );
}
```

```ts
// src/domain/chat/chat-router.ts の general の分岐
case `general`: {
  // 既存の配信処理
  notifyDiscordChat(this.sender, this.message, {
    namePrefix: `[§${this.playerCountryData?.color ?? `a`}${landName}${federationNameInChat}${penname}§r] §7${badge}`,
    messagePrefix: chatColor !== `§f` ? chatColor : undefined,
  });
  break;
}
```

`landName` は、所属国があれば国名、なければ Discord 向けの固定文字列。

実装時に確かめること:

- `IPC.send` は `beforeEvents.chatSend` の中から直接呼べる（「検証結果」）。`chat-router.ts` の処理はこのイベントの中で動くので、`system.run` で遅らせる必要はない。
- MakeCountry のビルドには、日本語の文字列リテラルを翻訳キーに置き換えるプラグイン（`tools/game-ui-localization.mjs`）が入っている。ビルド結果を見て、設定の `無所属` と `namePrefix` の組み立てが置き換えられていないことを確認した。
- `@discord-mcbe/shared` は MakeCountry の依存に足さない。連携コードは20行程度で、型や定数のために依存を増やすほどではないため。チャンネル名と機能名は上のように文字列で書く。

## 検証結果

### チャットイベントと装飾

1.26.63（`@minecraft/server` 2.12.0-beta）で確認した。

- `chatMessagePrefix` を設定すると、`beforeEvents.chatSend` と `afterEvents.chatSend` の両方で `message` の先頭に prefix が付く。`<MP>` を設定して `hello world` と発言すると、`message` は `<MP>hello world` になる。色コード（`§a`）でも同じ。
- `chatNamePrefix` / `chatNameSuffix` は `message` に含まれない。`chatDisplayName` は `prefix + name + suffix` を返す。
- 実行時の `Player` にあるチャット関連のプロパティは `chatDisplayName` / `chatMessagePrefix` / `chatNamePrefix` / `chatNameSuffix` の4つ。`chatMessageSuffix` はない。
- `chatSend` イベントに型定義にないプロパティはない（`message` / `sender` / `targets`、before は加えて `cancel`）。

### 連携の試作

MakeCountry のチャット処理を真似た試作アドオン（全チャットを cancel して送り直し、全体チャットだけを通知する）と、このブランチの discord-mcbe をローカルワールドで動かして確認した。

- `dmc:register` に `{"protocol":1,"connected":false,"features":["minecraft_chat"]}` が返り、登録できた。登録はサーバーへの接続より前だったが、接続後のチャットは問題なく届いた。
- `IPC.send('dmc:on_chat_send', ...)` は `beforeEvents.chatSend` のハンドラの中から直接呼べる。`system.run` で遅らせる必要はない。
- 全体チャットは Discord に `<[日本] tutinoko2048> aaa` の形で表示された。`namePrefix` の色コード（`[§a日本§r] `）は消えている。
- サーバーのコンソールにも `[World] <[日本] tutinoko2048> aaa` と、装飾付きの表示名で出た。
- 1回の発言で Discord に出るのは1件だけで、二重送信はなかった。
- 国チャットは Discord に出なかった。

チャットを cancel しないモード（標準の表示のまま流し、通知だけを行う）でも確認した。

- 通知した発言は、Discord に `<[cancelなし] tutinoko2048> aaa` の1件だけが出た。`afterEvents.chatSend` は発火していたが、discord-mcbe 自身の中継は止まっていた。
- 通知をやめると、`afterEvents.chatSend` が発火していても Discord には何も出なかった。`minecraft_chat` を登録したアドオンは、Discord に出すチャットをすべて自分で通知する責任を持つ。discord-mcbe からは、通知がないのが意図的（非公開のチャット、ミュート、連投制限）なのか漏れなのかを区別できないので、代わりに中継することはしない。
- `allow_addon_messages` を `false` にすると、サーバーのコンソールに警告が出て、通知されたチャットは捨てられた。discord-mcbe 自身の中継は続き、Discord には装飾なしの `<tutinoko2048> hi` が出た。

実機では確認していないこと:

- Webhook を使う場合の表示名とアバター。username に表示名を使い、アバター URL には装飾なしの名前を使うことは、単体テスト（`minecraft-chat-webhook.test.ts`）で確認している。

## 26.70 で確認すること

- `chatSend` イベントの `message` に `chatMessagePrefix` が引き続き含まれるか。プロトコルでは装飾と署名付きの本文が分かれるので、変わる可能性がある。含まれなくなっていたら、クライアントが `formatting.messagePrefix` を送るようにする。
- `chatMessageSuffix` が Script API に追加されているか。追加されていたら、`message` に含まれるかを確かめたうえで対応する。
- Managed Chat が有効なとき、`ChatSendAfterEvent.message` が元の本文と伏せ字にされた本文のどちらを返すか。Discord にはゲーム内で他のプレイヤーに見える内容を流したい。
- Managed Chat が有効なとき、`beforeEvents.chatSend` の cancel が今までどおり動くか。
