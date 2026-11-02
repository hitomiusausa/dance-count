# 音楽練習の有料プラン設計

作成: 2026-10-24  
状態: 実装前の設計案  
関連: [有料「音楽＋カウント」技術設計](./2026-10-23-paid-music-count-design.md)

## 1. 目的と決定

「使う」内の音楽練習を、Stripeの定期購読で利用する有料機能にする。購入者は、提供側が用意し、音楽・拍・ダンスとの対応・権利を確認した曲を選び、曲・カウント・表示を合わせて練習する。利用者が持ち込む曲、音声書き出し、曲のファイル保存・共有は初回提供に含めない。

### ひちゃんが決めたこと

- 音楽練習は有料プランに含める。
- 買い切りではなく定期購読にする。
- 決済事業者はStripeを使う。
- 曲は提供側で用意したものに限定する。各種目およそ3曲を準備目標にする。
- 契約中にアプリ内で練習し、利用者向けの書き出しはしない。
- 日本語・英語で提供し、海外利用も想定する。

### 今回の設計上の提案

- 最初は**「音楽練習プラン」1つ・月払い1つ**に絞る。年払い、曲パック、無料体験は初回に足さない。利用状況を見て後から追加する。
- プランには、その時点で販売カタログに掲載されている全審査済み曲を含める。継続的に追加する曲も同じプランに含める。
- 無料のフィガー・ルーティン・カウント練習はそのまま利用できる。音楽との同期再生だけを有料にする。
- 初回提供はオンライン必須とし、オフライン利用は利用権の更新・端末消去・退会の動きを検証した後に追加する。
- 金額、販売地域、通貨、税の扱い、無料試聴、アカウント認証サービス、同時利用端末数は未決。価格はUIやソースコードに埋め込まず、Stripe側の価格とサーバー設定から表示する。

この文書は購入処理・Stripe商品・Worker・音源ストレージの作成や公開を許可するものではない。設計とローカル実装を終え、Stripe test modeでの具体的な検証が見える段階で、本番設定・課金開始・公開は別に判断する。

## 2. 利用者に見える流れ

1. 「使う」→「音楽と」から、ラテン／スタンダード別の曲一覧を見る。
2. 未契約でも曲名、種目、プラン内容は見られる。保護された曲の再生・ダウンロードURLは渡さない。
3. 曲を選ぶと、その曲の利用状態を確認する。未契約なら「音楽練習プランで練習できます」と、価格・更新周期・解約時期・対象曲・書き出し不可を表示する。
4. 「プランに申し込む」でメール認証へ進み、その後Stripe Checkoutへ移る。無料の通常練習にアカウント登録を要求しない。
5. Stripeから戻ったら、成功URLの表示だけで解除せず、サーバーへ購入状態を問い合わせる。「購入を確認しています」の間は再度の購入ボタンを出さない。
6. 有効な契約を確認できたら曲一覧へ戻り、曲を再生する。
7. 「設定」内の「契約内容を確認・変更」からStripeのカスタマーポータルを開く。購入済みの人には「購入状態を更新」も提供する。

### 表示する状態

| 状態 | 画面と利用可否 |
|---|---|
| 未ログイン・未契約 | カタログは見える。曲は再生できず、プランと価格を案内 |
| Checkoutへ移動中 | 二重タップを防ぎ、戻る操作を残す |
| 購入確認中 | 待っている状態を表示。追加購入を促さない |
| 契約有効 | 審査済みカタログを再生可能 |
| 次回更新で解約予定 | `current_period_end`までは利用可能。終了日を表示 |
| 初回支払い未完了 | 利用不可。支払いを完了する案内 |
| 支払い失敗 | Stripe上の猶予・再試行状態を表示し、更新方法へ案内。猶予日数は商品条件決定時に固定 |
| 契約終了 | 音楽再生は停止。無料の練習、録音、ルーティンは残す |
| 通信できない | 契約切れと断定しない。オンライン確認が必要と案内。無料練習へ戻れる |
| 曲の公開停止 | その曲だけを新規再生不可にし、理由と代替曲／問い合わせ先を表示 |

価格、請求周期、更新日、解約の反映日、返金窓口は、申し込み確定の前と契約管理画面の両方で日英表示する。決済成功後にメールだけを購入証明としない。

## 3. 有料・無料の境界

### 無料のまま

- 既存のフィガー、ルーティン、基本カウント練習
- メトロノーム、音声の録音・選択など現在の無料機能
- 利用者が保存したルーティン、録音音声、共有済みデータ
- 音楽カタログの閲覧

### 有料プラン

- 審査済みカタログの曲を使う同期練習
- 基本カウントと、利用者自身が保存したルーティンでの練習
- 公開済みの範囲指定、くり返し、開始タイミング、速度変更、音量設定
- 契約中の追加審査曲

画面に有料機能として示すのは、実装・曲ごとの同期審査・端末確認が完了した機能だけにする。ストリーミングの一時バッファ以外、楽曲を通常のキャッシュ、Service Worker precache、共有ファイルへ保存しない。再生のためブラウザーへ届いた音を録音・抽出する行為を完全に防ぐDRMではないことを、利用条件と権利契約で許容できる曲だけ採用する。

## 4. 構成案

```text
Web/PWA (count.dancemap.jp)
  ├─ 無料画面・既存ローカルデータ
  ├─ メール認証 ── 管理された認証サービス（選定前）
  └─ /api/* ── Cloudflare Worker
                 ├─ D1: account↔Stripe customer、subscription、Webhook event台帳
                 ├─ Stripe Billing: Checkout、契約状態、Customer Portal
                 └─ 非公開R2: 審査済み音源・chunk
```

現在の`wrangler.jsonc`はWorkerコードを持たないStatic Assets構成で、`dist`をそのまま配信している。Stripeのsecret、Webhook検証、契約によるアクセス制御をブラウザーのJavaScriptだけへ置くことはできない。Cloudflare Workers Static AssetsにWorker scriptと`/api/*`の先行ルーティングを加え、同じドメインで静的画面とAPIを配信する案を第一候補とする。静的ファイルへの既存リクエストはAssets bindingへ渡し、`/api/*`だけWorkerが先に処理する。これは今後のCloudflare機能で実装できる構成だが、このプロジェクトでは未設定・未検証である。[Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/binding/)

音源はR2のprivate bucketへ置き、ブラウザーへR2の公開URLを渡さない。Workerがログインと利用権を確かめて、要求された曲revision/chunkだけを返す。R2 bucketは既定では公開されず、Workerから扱う場合もWorker側で認可を実装する必要がある。[R2のWorker利用と認可](https://developers.cloudflare.com/r2/api/workers/workers-api-usage/) 有料曲、解析JSON、権利記録は`public/`、`dist/`、Git、共有bundle、Service Worker precacheに入れない。

### アカウント

無料利用者にはログインを要求しない。申し込み時にメール認証を行い、サーバーが検証できる安定した`accountId`を作る。認証事業者は未選定だが、パスワードを自前管理せず、メールリンク等の日英対応を比較する。StripeのメールアドレスだけをアカウントIDに使わない。メール変更・重複・ログイン方法変更があっても購入を復元できるよう、サーバー台帳の`accountId`とStripe Customer IDを結び付ける。

## 5. Stripe決済の扱い

- サーバーが管理する`planKey`からPrice IDを選び、ログイン済みアカウントのCustomerに結び付けたSubscription Checkout Sessionを作る。ブラウザーからPrice ID、金額、対象曲、利用期限を受け取って権利を決めない。
- Checkoutはホスト型ページへリダイレクトする。初期値はStripeのサブスクリプション対応機能を使い、カード番号等を自アプリで受け取らない。StripeはCheckout Sessionをサーバーで作り、そのURLへ遷移する方式を提供している。[Stripe Checkout Sessions](https://docs.stripe.com/api/checkout/sessions)
- 成功・キャンセルURLは画面遷移にだけ使う。アクセス権はWebhook処理後にサーバーが照合し、`GET /api/me/entitlement`が返す状態を唯一の基準にする。
- 署名付きWebhookを受け、イベントIDを一意制約で保存して重複処理を防ぐ。イベントが遅れて届く・順不同で届くことを想定し、関連Subscriptionの現在状態をStripe APIで照合してから権利を再計算する。最低限、Checkout完了、subscriptionの作成・更新・終了、invoice支払い成功・失敗を購読する。Webhookの署名検証と配信失敗の監視を実装する。[Stripe Subscription Webhooks](https://docs.stripe.com/billing/subscriptions/webhooks)、[Webhook endpoint管理](https://docs.stripe.com/events/manage-webhook-endpoints)
- 「契約内容を確認・変更」はサーバーが認証後にCustomer Portal Sessionを都度作って短時間だけ返す。URLをDBやブラウザー保存領域へ恒久保存しない。Customer Portalはサブスクリプション管理用のStripeホスト画面。[Stripe Customer Portal](https://docs.stripe.com/api/customer_portal/sessions)
- 開発はStripe test mode、Webhookはローカル／stagingの署名付きテストイベントで確認する。本番キー、test modeの商品、Webhook secretを使い回さない。秘密値はCloudflare secretに置き、ビルド成果物とGitに含めない。

### アクセス判定

| Stripe状態・条件 | 音楽利用権 |
|---|---|
| `active`かつ請求期間内 | あり |
| 解約予約あり、請求期間終了前 | あり。終了日を表示 |
| `trialing` | 初回は無料体験を設けないため発生しない想定。将来追加時に別途定義 |
| `incomplete` / 初回決済未了 | なし |
| `past_due` | 定めた短い猶予期間だけ継続する案。具体日数は返金・再請求方針と一緒に決定 |
| `unpaid` / `canceled` / 期間終了 / `revoked` | なし |
| API通信失敗・状態が不明 | 既存の有効期間内leaseがあればその範囲内だけ利用。初回／期限切れの再生は許可しない。通信障害を自動で契約終了扱いにしない |

「解約」操作で利用権を即時剥奪するか、請求期間末まで使えるかを購入画面に明記する。設計案は**期間末まで利用可能**。返金、チャージバック、重複契約、誤購入の処理条件は販売条件とサポート手順で確定し、Webhook受信だけで画面上の理由を誤って表示しない。

## 6. APIとデータ

| API案 | 役割 |
|---|---|
| `GET /api/me` | 認証中のアカウント状態 |
| `GET /api/me/entitlement` | 利用可否、期間末、状態の更新時刻、対象catalog revision |
| `GET /api/music/catalog` | 公開可能な曲とrevision。未契約でも一覧用メタデータは返すが音源情報・署名URLは含めない |
| `POST /api/billing/checkout` | 認証、既存契約の重複確認、サーバー設定Price IDでCheckout Session作成 |
| `POST /api/billing/portal` | 現在のaccount/customerに限ったCustomer Portal Session作成 |
| `POST /api/billing/reconcile` | Webhook待ち・復元時にStripe側を再照合。クライアント申告で権利を更新しない |
| `POST /api/billing/webhook` | Stripe署名をraw bodyで検証、重複排除、subscription再取得、台帳更新 |
| `GET /api/music/:trackId/:revision/:chunkId` | 契約、公開状態、revisionを確認後にprivate R2からchunk取得 |

サーバー台帳の最小案:

```text
accounts(account_id, auth_subject, stripe_customer_id, created_at)
subscriptions(stripe_subscription_id, account_id, price_key, status,
              current_period_start, current_period_end, cancel_at_period_end,
              updated_at)
stripe_events(event_id UNIQUE, event_type, received_at, processed_at, outcome)
music_catalog(track_id, revision, published, rights_status, timing_status,
              dance_status, object_prefix, catalog_revision)
```

`entitlement`はStripe eventの履歴をアプリ独自の真実としてコピーするより、検証済みsubscription状態からWorkerで導出する。同期を速めるために短時間キャッシュする場合も、失効上限を定め、`unknown`を`active`へ推測変換しない。支払いカード、CVC、Stripe secret、magic link tokenはアプリDBへ保存しない。

認証APIはHttpOnly/Secure/SameSite cookie等のセッションを採用し、状態変更APIにはCSRF対策を置く。認証後の全APIでaccount scopeをサーバー側から決定し、クライアントの`accountId`を信用しない。`/api/music/*`はno-storeとし、公開キャッシュやService Workerへ契約依存の返答を保存しない。

## 7. データ・運用・利用条件

- 初版はオンライン利用。曲chunkをメモリへ読み、Service Worker・Cache API・通常HTTP cacheに残さない。通信断で権利が確認できない時は「購入状態を確認してください」と表示し、無料練習へ戻す。オフライン対応を加える場合は、署名leaseの期間、端末台数、ログアウト・更新・曲撤回後の扱いを別の実装審査にする。
- 利用者が作ったルーティン・録音音声・設定は有料曲と別保存。解約やログアウトで消さない。端末内に残るローカルデータは本人アカウントの購入復元機能とは別に説明する。
- 同じ契約を複数端末で復元する仕様はアカウント基準にする。初版の同時再生数・端末上限は未決。決めるまでは製品文言で「何台まで」と約束しない。異常な同時アクセスはrate limitと監査ログで検知し、正常利用者を通信障害だけで自動BANしない。
- 曲の権利・拍地図・ダンス上の対応をrevision単位で審査する。すべて承認済みでない曲を本番catalogへ公開しない。権利撤回時は新規配信を停止し、対象利用者へ説明する。すでにブラウザーへ届いた音源を遠隔回収できるとは表現しない。
- 日本・海外それぞれの自動更新表示、解約方法、返金、税、プライバシー、問い合わせ、サービス終了時の扱いを販売開始前に確認する。日本語／英語UI対応だけで、あらゆる国への販売準備が完了したとはみなさない。
- ユーザー自身のアップロード、音声ファイル書き出し、一般公開リンク、契約者間の音源共有は初版の範囲外。

## 8. 実装フェーズと受け入れ条件

| 段階 | 実装 | 完了条件 |
|---|---|---|
| 0. 商品条件 | 月額、価格、国、通貨、返金・解約条件、楽曲権利、無料試聴の要否を決める | Checkout前画面の日英文言と販売条件を承認 |
| 1. 認証・API基盤 | Worker、認証アダプタ、D1 migration、local/staging環境 | 無料練習にログイン不要。ログイン／ログアウト／他アカウント切替でデータと権利が混ざらない |
| 2. ロック画面 | カタログ、価格、locked/active/expired状態、設定内の契約管理入口 | 375pxと大きい文字でも購入条件・戻る・無料へ戻るが分かる。日英文言が一致 |
| 3. Stripe test mode | Checkout、Portal、Webhook、reconcile、状態導出 | 初回支払、成功return前のWebhook遅れ、二重イベント、失敗・回復、期間末解約、返金・失効、別端末復元を通す |
| 4. 曲の保護配信 | 非公開R2、Worker認可、revision/hash、cache方針 | 未ログイン・未契約・期限切れ・他track/revisionの直URL取得が拒否される。公開dist/SW/cacheに曲のバイト列がない |
| 5. 曲別受入 | 販売曲、拍・ルーティン・速度・端末・権利審査 | 各revisionで技術／人手／権利レビューとクレジット記録がそろう |
| 6. 公開準備 | 監視、サポート、データ保持、障害・撤回・返金手順、税務・法務確認 | Stripe本番設定は明示承認後。公開直前のrelease gateを別記録で完了 |

必須の拒否試験には、UIを経由しない直接音源URL、改ざんした`trackId`/`priceKey`/`accountId`、Webhook署名誤り、同一event再送、イベント順序逆転、Stripe API timeout、ログアウト後の再生開始、期限切れ後の再生を含める。Stripeの成功画面・クライアントstateだけで音楽を解放しない。

## 9. 今後の判断事項

1. 月額料金、海外向け価格・通貨、最初に販売する国・地域。
2. 認証事業者とメールログイン方式。認証なしにStripe Checkoutへ進ませないか、既存契約の本人確認をどうするか。
3. `past_due`猶予期間、解約の効力日、返金、チャージバック、アカウント削除後の請求履歴保持。
4. 初回販売する種目・曲数。各種目3曲を目標としつつ、全種目を揃える前に限定リリースするか。
5. 無料試聴を行う場合の専用短尺音源と権利。フル曲の無契約再生はしない。
6. PWA版のみ先行するか、iOS/Androidアプリ版も同時販売するか。アプリストア経由の販売は別の決済・規約設計にする。
7. オフライン再生・端末上限を初版後にどう提供するか。

現時点の次作業は、販売地域・価格を決めるための選択肢整理と、認証方式を含むWorker構成の技術スパイク。Stripe Dashboardでの本番商品作成、キー設定、購入・請求はまだ行わない。
