# 未確認英語名称の照合記録 2026-07-15（HANDOFF 優先1 残項目）

対象: `output/figure-terminology-audit.json` の未確認164固有名（照合前時点）。
結果: **33固有名（35出現）を公式一次資料との完全一致で英語化**。残131固有名は方針によりスキップ（理由別に下記）。

## 使用した一次資料（両方とも公式・レジストリの既存出典と同一）

1. ISTD Modern Ballroom Professional Modular Examinations Syllabus 2018（istd.org、16ページ。今回初めて全文取得し、ワルツ30・タンゴ27・フォックストロット等の指定フィガー一覧を確認）
2. ISTD Latin American Syllabus Outline September 2024（istd.org、41ページ。ルンバ・チャチャ・サンバ等のフィガー一覧）

## 判定基準（既存レジストリの前例に合わせて明文化）

**追加する**: 日本語名が公式フィガー名と完全一致する場合。公式名の括弧内に明記されたバリエーションは一致とみなす（前例: `Deplacement (Attack)`←アタック、`Spot Turns to Left or Right (Including…Underarm Turns)`←スポットターンtoレフト）。

- 方向・ポジション指定: 公式名に「to Left or Right」「(To Right and Left Side Position)」等がある場合のみ（例: ニューヨーク to LSP、アンダーアームターン トゥ ライト）
- 括弧内の変種名: Basic Movements (Closed, Open…) → クローズドベーシック等
- 公式名自体に含まれる「and」の日本語表記ゆれ（＆/&/アンド）: Fallaway Reverse and Slip Pivot 系

**スキップする**（HANDOFF §7 の規則どおり）:

| 理由 | 例 | 概数 |
|---|---|---|
| 部分指定（ステップ範囲） | ナチュラルターン(1-3)、リバースウェーブ（1-6）、ナチュラルトップ11-15 | 約25 |
| アンダーターン等の実行修飾 | ナチュラルスピンターン（アンダーターン）、ナチュラルロール（アンダーターン） | 約8 |
| エンディング・方法指定 | ザ チェイス エンディング1、アイーダ エンディング4 方法1 | 約10 |
| 複数フィガーの合成名 | ストップロック&レフトホイスク、新ワルツの連結行名13件 | 約35 |
| タイミング・ホールド修飾 | クローズドベーシックムーブメント1-5（グアパチャタイミング）、（ダブルハンドホールド） | 約6 |
| 公式一覧に存在しない名 | ターニング 5 ステップ、チェアー、オープンナチュラル、プロムナードロック、アペル、クラブウォークス、ジグザグ | 約15 |
| 公式名が結合形でしか存在しない | ウィング（公式は Open Telemark and Wing / Closed Wing のみ）、クロスヘジテーション、オープンテレマーク単独 | 4 |
| 公式の方向が逆/不一致 | ターニング・ロック・トゥ・ザ・レフト（公式は Turning Lock / Turning Lock to R） | 1 |
| どの公式変種か特定不能 | ボルタ、ボタフォゴ（朝の調査どおり専門家確認待ちを維持） | 2 |
| 種目にその公式フィガーが無い | タンゴのリバースターン単独・ウォークス系（モジュラー指定フィガーに Walk 単独なし）、チェンジオブダイレクション | 約6 |
| 出典未取得の種目 | ヴィエニーズワルツ4件（モジュラーシラバスにVWモジュールが無く、アクセス可能な公式一覧が現状ない） | 4 |
| 練習用語 | 予備足（3種目） | 3 |

## 今回追加した33固有名（種目別）

- **タンゴ(8)**: Fallaway Four Step / Oversway / Basic Reverse Turn / The Chase / Five Step / Contra Check / Fallaway Reverse and Slip Pivot（表記ゆれ2）
- **ワルツ(2)**: Contra Check / Fallaway Reverse and Slip Pivot
- **スローフォックス(2)**: Curved Feather to Back Feather / Fallaway Reverse and Slip Pivot
- **ルンバ(10)**: Closed Basic Movement / Spot Turns / Underarm Turns(2) / Hand to Hand(3) / Advanced Hip Twists / New Yorkの位置指定エイリアス(2)
- **チャチャ(9)**: Closed Basic Movement(2) / Underarm Turns(3) / Shoulder to Shoulder(2) / Hand to Hand(1) / New York LSPエイリアス(1)
- **サンバ(2)**: Progressive Basic Movement / Reverse Basic Movement

## スキップ判断で迷った境界例（次の調査者への注記）

- **サンバのウィスク トゥ ライト/レフト**: 技術書のチャート名は Whisk to Left/Right だが、手元の公式アウトラインの名称は「Whisks (also with Lady's Underarm Turn)」のみで方向を含まない。出典に書かれていない以上追加しない（技術書を取得できたら再判定）。
- **サイドサンバウォーク（1回目）等**: 「Side」は公式括弧内にあるが「（1回目）」は反復注記で公式名の一部ではない。規則（修飾付きは英訳しない）を優先。
- **プロムナードシャッセ（ワルツ）**: Chasse from PP と同一フィガーの可能性が高いが、名称としては別物なので追加しない（内容の同定は名称照合の範囲外）。

## 検証

- `npm test` 94/94（レジストリの重複エイリアスは読み込み時に例外で検出される）
- `npm run terminology:audit`: verified 144→**179**/317、unverified 173→**138**、verifiedUnique 103→**136**
