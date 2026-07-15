# 一次資料調査 2026-07-15（HANDOFF 優先1）

調査者: Claude (Fable 5)。HANDOFF.md §8「優先1」の5項目のうち4項目を調査。
ルール: 公式一次資料と非公式参照を区別する。推測変換はしない。裁定できない項目は理由付きで残す。

## 結論サマリー

| 対象 | 裁定 | 状態 |
|---|---|---|
| サンバ「ボルタ」`&&&&` | Volta timing は `1a2a3a4`（数字=3/4拍、a=1/4拍）。`&&&&` は数字を落とした旧表記と強く整合 | 根拠収集済み・専門家確認待ち |
| ジャイブ6フィガー `12&3&4` | 全6フィガーとも QQ + QaQ + QaQ（8歩）。旧表記はシャッセ1回欠落＋`&`(1/2拍)と`a`(1/4拍)の混同の疑い | 根拠収集済み・専門家確認待ち |
| タンゴ先頭 `&` | Five Step 基本は QQQQS。`&QQQQS`（Turning Five Step）を裁定できる公開一次資料なし。旧アプリ実装では先頭&=「後ろの拍に丸め込む」 | 一次資料特定済み（未参照）・専門家確認待ち |
| 小節途中終了5ルーティン | 旧アプリはループ時に小節パディングなしで即先頭へ戻る。「意図された休止」は旧データに存在しない（旧アプリに小節位相の概念が無い） | 実装事実として裁定済み。対応方針は製品判断 |
| 未確認英語名称160件 | 未着手 | 次回へ |

---

## 1. サンバ「ボルタ」`&&&&`（samba_silver figure 5）

### 裁定

- ボルタ系のタイミングは **`1a2a3a4`**。数字ステップ=3/4拍、`a`=1/4拍。連続ボルタは2小節（サンバは2/4拍子・1小節2拍）。
- Spot Volta は **`1a2`**（1小節で1回転）。Travelling Volta は「1a2」+「a1a2」の反復で2小節（さらに1〜2小節延長可）。
- 旧表記 `&&&&` は「4つの分割拍のみを記録し数字カウントを落とした表記」と強く整合する。ただしこの解釈自体は推測なので、**自動変換はせず専門家確認待ちを維持**。
- v2実装上の注意: サンバの許可トークンは `1 2 S Q & a @`（`src/v2/dance-profiles.js:11`）で数字3・4が無い。`1a2a3a4` を採用する場合は「`1a2a1a2`（2小節表記）」か語彙拡張のどちらかの実装判断が必要。**本調査では決めない。**

### 根拠

1. 【公式】ISTD Latin American Syllabus Outline (September 2024, istd.org, 41ページ)
   - Samba フィガー一覧に Volta Movements / Criss Cross Volta / Solo Spot Voltas / Shadow Travelling Volta / Shadow Circular Volta が実在（p.36相当）。
   - Grade 4 Samba 課題に「the 1 a 2 and SQQ timings」、Grade 5 に「QQS timing」「1.2.3 timing」の記載 → `1 a 2` 系タイミング語彙が公式に存在する傍証。
   - **この文書にフィガー別カウント表は無い**（名称一覧のみ）。
   - URL: https://www.istd.org/documents/latin-american-syllabus-outline/latin-american-syllabus-september-24.pdf
2. 【非公式・技術参照】Dance Central「Volta Movements」
   - Travelling Volta: 「1: LF in front of RF (Cuban Cross)／a: RF to side…／2: part weight to RF…／a 1 a 2: Repeat step 2 and 3 twice」＝2小節、延長可。
   - Spot Volta: 1小節で1回転（1a2）。Circular Volta: 2小節で1回転（Silver/Gold）。
   - URL: https://www.dancecentral.info/ballroom/international-style/samba/volta-movements
3. 【非公式・技術参照】Dance Central「Samba Technique」
   - 「Bounce action is used on all figures having a count of "1a2 3a4" basic timing and **Volta timing (1a2a3a4)**」（原文確認済み）。
   - URL: https://www.dancecentral.info/ballroom/international-style/samba/samba-technique
4. 【非公式・指導者教材】SOSA Dance (UK)「Samba Footwork Manual」PDF
   - 「In other steps such as Voltas … the timing is syncopated further to **'1a2a3a4'**, which is split into ¾ beat on steps '1,2,3,4' and ¼ beat on steps 'a'.」（原文確認済み）
   - URL: https://sosadance.co.uk/wp-content/uploads/2017/07/Samba-Footwork-Manual-3.pdf
5. 【非公式・シラバス転載】UVA Ballroom「ISTD Latin Syllabus」PDF
   - ISTD級での位置: Volta Movements=Newcomer相当（Pre-Bronze枠）、Criss Cross Voltas / Solo Spot Volta=Bronze、Circular Volta=Silver、Shadow Circular Volta=Silver。
   - 旧データの「シルバー級」は日本の級（団体未特定）であり、ISTDの級とは別体系。名称の一致だけで準拠を推定しない。
   - URL: http://ballroomatuva.org/wp-content/uploads/2015/06/ISTD-Latin-Syllabus.pdf

### 未解決

- フィガー別カウントを載せた**公式**一次資料（ISTD Latin American technique 書籍、Laird "Technique of Latin Dancing"、WDSF Technique Book）はいずれも有料印刷物で未参照。
- 旧ルーティン「ボルタ」が Travelling / Criss Cross / Solo Spot のどれを指すかは旧データからは判別できない。

---

## 2. ジャイブ6フィガー `12&3&4`（jive_silver 全図形）

### 裁定

- 対象6フィガー（Basic in Place / Fallaway Throwaway / Link / Change of Places R to L / L to R / American Spin）は、参照資料上いずれも **Q Q + QaQ + QaQ（2歩＋シャッセ2回＝8歩、6カウント）**。
- 旧表記 `12&3&4` は (a) シャッセが1回分しか無い、(b) 分割が `&`（1/2拍）で `a`（1/4拍）でない、の2点で参照資料と不整合。
- 数字の振り方は流儀差がある: ISTD系は「1 2 3a4 3a4」、米国式は「1, 2, 3&4, 5&6」。プロジェクトのv2語彙・テンプレートは `123a45a6`（`src/v2/dance-profiles.js:13`）で後者の番号体系＋ISTDの`a`分割。**旧表記からの自動変換はしない**（HANDOFF方針維持）。

### 根拠

1. 【公式】ISTD Latin American Syllabus Outline (September 2024)
   - Jive フィガー一覧に対象6フィガーすべて名称実在（Basic in Place, Fallaway Throwaway, Link, Change of Places Right to Left / Left to Right, American Spin）。カウント表は無い。
2. 【非公式・技術参照】Dance Central 各フィガーページ（6ページとも原文確認済み）
   - Basic In Place: 「Q: Close LF to RF / Q: Replace weight to RF / QaQ: Side Chasse LRL / QaQ: Side Chasse RLR」
   - Link: 「Q Q + QaQ (Fwd Chasse) + QaQ (Side Chasse)」
   - Fallaway Throwaway: 「Q Q + QaQ + QaQ」
   - Change of Places R to L / L to R: 「QQ (1-2 of Fallaway Rock/Link) + QaQ + QaQ」
   - American Spin: 「QQ (1-2 of Link) + QaQ + QaQ」
   - URL例: https://www.dancecentral.info/ballroom/international-style/jive/basic-in-place （他5ページ同構造）
3. 【非公式・シラバス転載】UVA Ballroom PDF: 対象6フィガーは ISTD では Pre-Bronze。
4. 【参考】6カウントリズムの数字表記例「1, 2, 3&4, 5&6」（米国系サイト複数。`&`表記は米国式で、ISTDの`a`=1/4拍と拍値が異なる可能性に注意）。

### 未解決

- `a` の正確な拍値（1/4）をフィガー別に明記した公式一次資料は未参照（有料技術書のみ）。
- 「3a4 3a4」vs「3a4 5a6」の番号体系はプロジェクトの製品判断（現行v2は `123a45a6`）。

---

## 3. タンゴ 新ゴールド級の先頭 `&`（tango_new_gold 3フィガー）

対象: ターニング 5 ステップ `&QQQQS`／ナチュラルピボット&ナチュラルスピン `&QQ`／ドロップ・オーバー・スウェイ&コントラ・チェック・ツー・PP `&QQSSQQS&S`

### 裁定

- Five Step（ISTD Gold, 出典は Alex Moore "The Ballroom Technique" 10th ed. 1994 系）: 基本タイミング **QQQQS**。代替タイミングとして **QQS&S**（拍値 1/2, 1/2, 3/4, 1/4, 1）と **S&QQS**（3/4, 1/4, 1/2, 1/2, 1）が参照資料に記載 → 図中の `&` は**直前の拍から借りる**1/4拍。
- 「Turning Five Step」の `&QQQQS`（先頭&）を裁定できる公開資料は今回見つからず。Turning Five Step は ISTD 10th ed. のシラバス外で、一次資料候補は **WDSF Technique Book (Tango)**（有料・未参照）。
- 【旧アプリの実装事実】（`dance-count-B_215.html` 原文確認済み）
  - `toMeasures`（line 1965前後）: 「例外: 小節先頭の&は後ろの拍に丸め込む（前打ち音扱い）」
  - `getBeatSec`（line 2441-2470）: 先頭&の直後の拍は `base - 0.5拍` に短縮。つまり旧再生では **先頭&=当該小節第1拍の前半を占有し、本体の拍が半拍遅れて鳴る**。
  - line 2562 に「先頭&は半拍早めに発火（前打ち音）」というコメントがあるが、コードは `when2adjusted = when2`（無調整）で**コメントと実装が不一致**（放棄された実装の残骸とみられる）。
- 移行の選択肢は2つ: (A) 旧再生の忠実再現＝先頭&を小節頭に置く、(B) 音楽的解釈＝前小節末のアナクルーシス（Five Step 代替タイミングの `&` が「前の拍から借りる」ことと整合）。**どちらが正かは資料で裁定できておらず、専門家確認待ち。**

### 根拠

1. 【非公式・技術参照】Dance Central「Five Step」: 基本 QQQQS と代替 QQS&S / S&QQS（拍値付き）。
   - URL: https://www.dancecentral.info/ballroom/international-style/tango/five-step
2. 【非公式・シラバス整理】Ballroom Index「Tango Syllabus ISTD」: Gold に Five Step。「taken from the 10th edition of the Ballroom Technique by Alex Moore, last amended in July 1994」。
   - URL: https://ballroomindex.weebly.com/tango-syllabus-istd.html
3. 【一次資料候補・未参照】Alex Moore "The Ballroom Technique" (ISTD, 10th ed.)、WDSF Technique Books（いずれも有料印刷物）。

---

## 4. 小節途中で終わる5ルーティン（tango_gold / quickstep_silver / rumba_silver / pasodoble_silver / slowfox_1grade）

### 裁定

- 旧アプリのループ実装（`dance-count-B_215.html:2598`）: 最終イベントの拍長経過後に `seqPos=0` で**即座に先頭へ戻る**。小節末までのパディング・休止は一切無い。
- 旧アプリの再生モデルは「拍の平坦な列」で、小節位相の管理は表示用の `toMeasures` のみ。**「ループ前の休止」や「小節を合わせる意図」は旧データ・旧実装のどちらにも存在しない。**
- したがって ROUTINE_INCOMPLETE_BAR はデータの意図ではなく、旧アプリが小節位相を持たなかったことの産物。v2側の検出が正しい。
- 各論:
  - rumba_silver: 全フィガーが「2」開始（ルンバの1はホールド）。旧データには保持拍「1」が時間として存在せず、旧アプリでは1小節8拍分の音楽に対して7拍で回っていた（音楽とずれる）。
  - slowfox_1grade: 先頭「予備足 @@@S」= 3無音拍+S(2拍)=5拍で、以降の全フィガーが半小節ずれたまま進む構造。
  - pasodoble_silver: アペル(1拍)+アタック(2拍)開始で、フィガー境界が小節を跨ぐこと自体はパソの振付として普通。ルーティン合計が小節に満たない点のみが問題。
- 対応方針は製品判断（資料裁定ではない）: (A) ループ時に次の小節頭まで休止を自動挿入、(B) ルーティン末尾に明示の休止フィガーを足す、(C) 元資料（日本の級ルーティン資料）で正しい小節構造を確認して修正。**本調査では決めない。**

### 根拠

- `dance-count-B_215.html:2598`（ループ）、同 `toMeasures`／`getBeatSec`（小節位相なしの拍列再生）。いずれも原文確認済み。

---

## 5. 未着手（次回へ）

- 未確認英語名称160件の照合（`output/figure-terminology-audit.json`）。今回の資料では ISTD Latin/Ballroom の名称一覧（公式アウトライン＋転載）まで確保済みなので、次回は種目別に突合する。
- レビュー画面へは `research/review-workspace-import-2026-07-15.json`（本調査の記録をスキーマv1で書き出したもの）を用意した。読み込み機能は HANDOFF 優先2の未実装項目。

## 資料の信頼度区分（本調査で使用）

| 区分 | 資料 | 用途 |
|---|---|---|
| 公式 | ISTD Latin American Syllabus Outline Sept 2024 (istd.org) | 名称実在・級・タイミング語彙の確認 |
| 公式(既収載) | ISTD Modern Ballroom Modular Syllabus (istd.org) | 既存レジストリの根拠（変更なし） |
| 非公式・技術参照 | dancecentral.info 各ページ | カウント構造の詳細（出典書籍の明記なし） |
| 非公式・指導者教材 | SOSA Dance Samba Footwork Manual | ボルタ拍値の裏付け |
| 非公式・転載/整理 | ballroomatuva.org PDF, ballroomindex.weebly.com | ISTD級区分・シラバス版の特定 |
| 一次資料候補(未参照) | Alex Moore "The Ballroom Technique" 10th ed., ISTD Latin technique書, Laird, WDSF Technique Books | 有料印刷物。専門家確認の際の指定図書 |

非公式資料は「カウント構造の候補」の根拠にはなるが、公開判断（初心者プリセット昇格）の根拠にはしない。昇格には一次資料の該当ページ確認または専門家レビューが必要（HANDOFF §6 の方針を維持）。
