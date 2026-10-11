# SDD ledger — plan: docs/superpowers/plans/2026-10-11-app-v1-stage1.md
Spec: docs/superpowers/specs/2026-10-11-app-v1-design.md (approved by PO 2026-10-11)
Workspace: main checkout on branch agent/app-v1 (not a separate worktree; PO approved working on this branch). Start HEAD: ccd99af

## Preflight rulings
- Ruling: beatMap は最初の拍より前の時刻を「最初の間隔」で外挿する（計画者案を採用） — 曲の頭の無音・アウフタクトを素直に扱え、v1では曲再生が無いので影響は tempo-map の単体テストのみ — 外れたら第2弾で曲を載せる時に外挿規則を変えるだけ（v1の再生経路に影響なし）
- Ruling: 作業は別worktreeでなく本体チェックアウトの agent/app-v1 ブランチで行う — mainではなく、PO承認済みブランチ・未追跡はフィガー/のみ — 外れても main は無傷、ブランチを捨てれば戻る
- Preflight scan table: .superpowers/sdd/2026-10-11-app-v1-stage1/preflight-scan.md (5 conflicts)
- Ruling (P1 タブ位置): 段1は全幅で下タブのみ。1024px以上の上部タブ（Ruling 21）は段2のシェル作業へ持ち越し — 段1は空画面の殻で、PC配置は段2でS2の2領域と一緒に作るのが自然 — 外れても段2でCSS追加のみ
- Ruling (P2 集約対象): 計画どおり timeline-view-model.js は触らず、rhythm-compiler.js と dance-timing-audit.js を tempo-map に集約。仕様 §10・Ruling 20 の該当文言は誤記として扱う（段1締めで仕様の文言を直す） — 計画者が tick→秒の計算が無いことを確認済み — 外れたら計算漏れだがゴールデンと grep で検出可
- Ruling (P3 beatMap 範囲外): 最初の拍より前は「最初の間隔」、最後の拍より後は「最後の間隔」で外挿（近い方の間隔）。仕様の「最後の拍間隔で外挿」は後方のみを述べた文として読む — 曲頭のアウフタクトを自然に扱える — v1では曲再生が無く影響は単体テストのみ
- Ruling (P4 tools の独自式): tools/audit-all-dance-timing.js の独自 tick→時刻計算は「独立した検算（オラクル）」として残す。tools/render-subdivision-audio-review.js は開発用で公開ビルド外なので残す。検証 grep はこの2ファイルを理由つきで除外 — 監査ツールがエンジンと同じ関数を使うと検算にならない — 外れても公開アプリの再生経路に影響なし
- Ruling (P5 Task 5 の振る舞い差): 「無改変」を優先。tempo の既定値は関数本体で遅延生成（stop() と既存の引数検証の後に `tempo ??= constantTempo(bpm)`）し、検証順と Infinity BPM の扱いを移設前と同一に保つ — Global Constraint L15 とゴールデンの趣旨 — 外れたらゴールデンが落ちて気づける

## Tasks
- Task 1: minor (deferred): compare-timing-audit.js は欠損/壊れたファイルで生のスタックトレース（終了コードは非0でゲートは保たれる）
- Task 1: minor (deferred): ゴールデンは偽クロック40刻み分のみ検査（式の検出には十分・長時間挙動は一部のみ）
- Task 1: minor (deferred): ゴールデンが1行305KB JSONで差分が読みにくい（brief指定）
- Task 1: minor (deferred): 「ゴールデンを書き換えない」がコメントのみで強制なし
- Task 1: complete (commits ccd99af..72701a1, review clean; controller verified src untouched, 128/128, timing:compare rc=0)
- Task 2: minor (deferred): 旧画面(public/*.html→legacy)は ?v= 付きimportのため voice-pack-loader が2インスタンスになりうる。controller確認: ページ内に instanceof VoicePackError は無く実害なし（計画者の発見6と同じ）。旧画面は保守停止(Ruling 10)
- Task 2: complete (commits 72701a1..e912f5b, review clean; controller verified 130/130, timing:compare identical)
- Task 3: minor (deferred): README.md:30・HANDOFF.md:30-36・timing-audit-2026-07-13.md:67・dance-count-v2-architecture.md:319 が旧 public/*.html を参照（Task 11 の README 更新と段1締めで直す）
- Task 3: fix round 1/5 (1 addressed, 0 open — legacy/ の /public/ 絶対URL 7か所; commits 152a566..9c5af28)
- Task 3: complete (commits e912f5b..9c5af28, review clean after 1 fix round)
- Task 4: minor (deferred): constantTempo は Number() 変換で '84'・[84]・true を受け付け、.bpm が文字列のまま残る（brief指定・旧 !(bpm>0) 互換）。Task 5 以降は数値を渡すこと
- Task 4: complete (commits 9c5af28..7f50437, review clean)
- Ruling (P5 補足・Task 5 着手前): brief の「既定引数 tempo = constantTempo(bpm)」は呼び出し直後に評価され、既存の検証や stop() より先に例外を出しうる。→ 既定引数をやめ、関数本体で既存の検証・stop() の後に `tempo ??= constantTempo(bpm)` とする。旧コードが受け付けていた非有限BPM（Infinity等）を新コードが RangeError で拒むのは「意図した厳格化」として認め、テストで明示する — UIからは非有限BPMは来ず、NaN時刻を作らない方が安全 — 外れても単体テスト1件の期待値変更で済む
- Task 5: minor (deferred, 第2弾の設計に持ち越し・重要): 再生エンジンは tempo を「拍の長さ」「区間の長さ」「区間ローカルtick」として使っている（beatSeconds=tickToSeconds(960)、patternDurationSeconds(rangeDurationTicks)、rangeEventTimeSeconds の localTick）。一定テンポでは同じだが、beatMap（最初の拍≠0ms・不等間隔・rangeStartTick>0）では誤る。曲を載せる段では「絶対tickの差」で時刻を求める設計にすること（v1の再生経路は constant のみで影響なし）
- Task 5: minor (deferred): scheduleAhead/scheduleIteration/frame で bpm を tempo と並べて受け取り未使用（呼び出し側が常に tempo を渡すようになったら整理）
- Task 5: complete (commits 7f50437..70f5318, review clean; controller verified 137/137, timing:compare identical)
- Ruling (Task 6 check-dist の抜け穴): レビューは Minor（計画由来）としたが、Ruling 10「未監修データを公開ビルドに入れない」の唯一の機械ゲートなので今修正する。check-dist の禁止文字列に imported-routine-sources.json 固有のキーを追加し、src/engine/data/ の中身が dist に入れば必ず落ちるようにする — 段3でルーティン機能を作る時に誤って import される経路が現実的にある — 外れても数行の検査追加で、過剰でも害はない
- Task 6: fix round 1/5 (1 addressed, 0 open — check-dist の未監修データ検出の抜け穴; commits 2cfd47b..487f410)
- Task 6: minor (deferred): src/engine/data/ にJSONを足したら check-dist に目印を手で追加する必要あり（フォルダ内全ファイルに目印があるかの自己検査を足せば手作業が消える）
- Task 6: minor (deferred): base.css に Task 10 で使う .dc-tabs/.dc-appbar/.dc-shell が先行して存在（設計どおり）
- Task 6: complete (commits 70f5318..487f410, review clean after 1 fix round)
- Task 7: minor (deferred): 日英キー一致は実行時テストのみ（型では強制されない）／createAppTranslator の as キャスト／日本語禁止語は部分一致（将来の誤検出は言い換えで対処）
- Task 7: complete (commits 487f410..cef8951, review clean; 143/143)
- Task 8: minor (deferred, 段3へ): routineId に 'new' を許すと #/routines/new（S4新規）と曖昧。段3でID生成時に 'new' を予約語として除外すること
- Task 8: minor (deferred): buildHash が param を ID_SEGMENT で検証しない／長大入力・'//' の敵対ハッシュがテストで固定されていない（コード上は正しい）
- Task 8: minor (deferred, 段2へ): Ruling 23 の ?ui-state=no-sound を parseHash が落とす・Route に query 欄なし（preflight 指摘）
- Task 8: complete (commits cef8951..08057c5, review clean; 149/149)
- Ruling (Task 9 境界テストの強化): レビューは Minor（計画由来の正規表現）としたが、段2〜5で AudioContext・MediaRecorder・WakeLock・matchMedia を実装する直前で、§10「platform 以外から直接触らない」の唯一の機械ゲートなので今強化する — 見逃しの典型（分割代入・裸の navigator・matchMedia・AudioContext・MediaRecorder・globalThis/self・document.defaultView・.js/.mjs）を捕まえ、location/history はプロパティアクセス（x.location）を除外して誤検出を減らす — 外れても誤検出はテスト失敗で気づけ、修正は正規表現だけ
- Task 9: fix round 1/5 (1 addressed, 0 open — 境界テストの見逃し・誤検出; commits 92028bc..8d4530b)
- Task 9: minor (deferred): 境界検出はテンプレート文字列の ${...} 内（例 `${window.innerWidth}`）を見逃す／`x;// window` は過検出（安全側）
- Task 9: minor (deferred): hash.ts の readHash 等は window 無し環境で ReferenceError（import時は安全。ルーターのテストは window をスタブする前提）
- Task 9: complete (commits 08057c5..8d4530b, review clean after 1 fix round; 153/153)
- Task 10: fix round 1/5 (1 addressed, 0 open — 冷えた開発サーバーで smoke が不安定（optimizeDeps.include 追加）; commits d6c1e2b..c68e043). controller が自分で node_modules/.vite 削除→新規起動→smoke を1回実行し rc=0 を確認
- Task 10: minor (deferred): legacy の routine-editor 確認が固定1000ms待ち／smoke 自体はサーバー起動待ちをしない
- Task 10: minor (deferred, 段2へ): 1280幅では本文が中央の細い列・タブは全幅（Ruling 21 の PC 配置は段2）／タブにアイコン無し（段2の持ち越し）／言語選択は保存しない（段3の設定保存で）
- Task 10: complete (commits 8d4530b..c68e043, review clean after 1 fix round; 153/153)
- Task 11: fix round 1/5 (2 addressed, 0 open — HANDOFF の起動手順・仕様の上部タブの段表記; commits 4a04014..7451564)
- Task 11: complete (commits c68e043..7451564, review clean after 1 fix round; 153/153)
## Final review
- Final review (opus, ccd99af..7451564): Fix before closing — (1) HANDOFF の src/v2 残り・tempo-map 未記載 (2) npm test が再帰せず .tsx も拾わない。Important 2〜4 と Minor 1〜5 は下記の裁定どおり
- Ruling (最終修正便に含める): Important 2 のうちハーネスの入力をリテラル化（ゴールデンはバイト同一のまま）と「再生成は裁定と差分要約がある時だけ」の手順書き — 段2〜3で dance-profiles を触ると無関係にゴールデンが落ち、安易な再生成で番人が消えるのを防ぐ — 外れても手順文書の追加だけ
- Ruling (最終修正便に含める): Important 4 の安い守り — start() に constant 以外の tempo が来たら明示的に例外。既存の「beatMap が既定を置き換える」テストはこの守りを確かめるテストに書き換える。tempo-map.js に「tickToMs は位置で長さではない」と注記 — 曲の段まで誤った時刻を黙って出す経路を塞ぐ — 外れても曲の段で守りを外すだけ
- Ruling (持ち越し): Important 3（境界テストに new Audio・document.createElement('audio')・visibilityState/visibilitychange・裸の addEventListener/requestAnimationFrame/fetch・.jsx を追加）と index.html の lang/title は段2の最初のタスク。recorded-voice-store の IndexedDB v1 直開きは段3計画で platform/storage 経由にする（v2化で VersionError になるため必須）。?ui-state=no-sound は段2計画の必須項目 — レビュー推奨どおり段2コードより先に入れる — 外れたら段2で見張りの漏れ
- Ruling (最終修正便に含める): Minor 5 の記録文書2本（timing-audit-2026-07-13.md・dance-count-v2-architecture.md）は本文を書き換えず冒頭に「2026-10-11: public/ は legacy/ へ移動」の一行注記のみ
- Final fix wave: F1〜F5 addressed (commits 7451564..891ed30); scoped re-review: all findings addressed
- Final: parked — patternDurationSeconds/rangeEventTimeSeconds は tempo 引数を受けるが beatMap では range 開始≠0 で誤る（start() は beatMap を拒否するので再生経路は安全）— Ruling: 曲の段で絶対tickの差に作り直す時に一緒に直す — 外れたら直接呼んだ時だけ誤る
- Stage 1 closed: controller verified 154/154, typecheck ok, dist OK, timing:compare identical, golden byte-identical since 72701a1
