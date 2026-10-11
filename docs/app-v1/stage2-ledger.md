# SDD ledger — plan: docs/superpowers/plans/2026-10-11-app-v1-stage2.md
Spec: docs/superpowers/specs/2026-10-11-app-v1-design.md (approved by PO 2026-10-11). Rulings 26–34 in docs/app-v1/rulings.md.
Workspace: main checkout on branch agent/app-v1 (same as stage 1; PO said to continue stages 2–8 on this branch). Start HEAD: c75919e. PO approved plan 2026-10-11 ("いいよ！どんどん進めよ").

## Preflight scan
| Pair / task | Produces vs consumes | Finding |
|---|---|---|
| T1→T3→T4→T8→T9 App.tsx | T1 effect, T3 full, T4 sprite edit, T8 S2 edit, T9 full final | consistent (dry run passed each step) |
| T1→T4→T8 messages.ts | documentTitle (T1), back (T4), full replace (T8 includes both) | consistent |
| T3↔T5 speed.ts | T3 creates full file, T5 adds tests only | consistent |
| T4↔T7 main.tsx | T4 adds fonts import, T7 full file keeps it | consistent |
| T6→T7 displayLatencySeconds | engine option → session-deps | consistent |
| T2→T4 goBack → BackButton | consistent |
| T7→T8/T9 session/autoplay/unlock | consistent |
| T9↔T10 smoke-practice script registration in T10 | consistent |
| Each task self-consistency | tests vs code verified by planner scratch + Sonnet dry run (all Expected matched after 3 fixes applied to plan) | clean |
- Ruling: work in the main checkout on agent/app-v1, not a separate worktree — PO decision in HANDOVER, untracked フィガー/ only — if wrong, branch is discardable; main untouched.
- Ruling: implementers start their own dev server on 5173 (strictPort) when a step needs it and stop it afterwards; 4173 already serves legacy via an old python server — if wrong, smoke steps fail loudly and are re-run.

## Tasks
- Task 1: minor (deferred): App.tsx の useEffect 依存 [locale, i18n] は冗長（Task 3 で App 全文置換のため自然消滅）
- Task 1: minor (deferred): 境界検出の残る穴（${} 内の入れ子バッククォート・`}`、new なしの Audio(、document['hidden']、WebSocket/EventSource）
- Task 1: minor (deferred): documentTitle が日英同一である理由（D2）のコメントなし
- Task 1: complete (commits c75919e..82f1913, review clean)
- Task 2: Ruling (Important 1, plan-mandated: 親への置き換え後に visited に幻の履歴が残る): 直す — 直接開いた S8 → 戻る(S7 へ置換) → S7 の戻るで historyBack しアプリの外へ出る実害あり。純粋関数 replaceTop(stack, hash) を back-stack.ts に足し、goBack の置き換え分岐で setHash の前に visited を置き換える（続く hashchange の recordVisit は先頭一致で無変化）。テストで固定 — 外れても戻る先が親に変わるだけ。
- Task 2: Ruling (Important 2, plan-mandated: 前進 A→B→A を「戻った」と誤認): 仕様の範囲で許容し、コードに限界を明記するだけ — 誤認しても行き先は親画面（仕様 §3 の代替動作）で、タブ移動先は戻るの無いルート画面が多く実害が小さい。方向をハッシュだけで判別できないのは設計上の限界 — 外れたら段8で history.state に印を付ける方式へ。
- Task 2: minor (deferred): hashPath が末尾スラッシュ・未知パスを正規化しない／parseHash の冗長な const path／useRoute 利用者が複数になると recordVisit が多重（現状1つ）／RED を後付けで再現
- Task 2: fix round 1/5 (2 addressed, 0 open — replaceTop で幻の履歴を消す・前進誤認の限界をコメント; commits b8c484d..4fc6b2f)
- Task 2: complete (commits 82f1913..4fc6b2f, review clean after 1 fix round). NOTE: テスト件数は計画より +2（以後の Task の期待件数は計画値＋2: T3=174, T4=176, T5=196, T6=197, T7〜=215）
- Task 3: Ruling (Important 1, plan-mandated: 連続保存で read-merge-write が競合し、片方の項目がディスクから消える): 直す — S2 を開いた時の lastDanceId と直後の速さ・型の変更、WakeLock 案内の印などで実際に連続する。store.ts の saveSettings を1本の Promise 列で直列化（失敗しても列は続く）し、yield する偽ストレージで「待たずに2回保存しても両方残る」をテスト — 外れても保存が数ms遅れるだけ。
- Task 3: minor (deferred): onblocked で reject 後も open 要求が生きる・onversionchange で close しない（v3 を作る段で対応）
- Task 3: minor (deferred, 段4へ): normalizeSettings が selectedVoiceId を常に標準音声へ戻す — 段4で声の選択を保存する時に緩めること
- Task 3: minor (deferred): store.ts の DEFAULT_SETTINGS 再 export は未使用
- Task 3: fix round 1/5 (1 addressed, 0 open — saveSettings を Promise 列で直列化; commits f140e53..591fb30)
- Task 3: minor (deferred): 別タブ間の上書きは直列化の対象外
- Task 3: complete (commits 4fc6b2f..591fb30, review clean after 1 fix round). テスト件数は計画＋4（T4=178, T5=198, T6=199, T7〜=217）
- Task 4: minor (deferred): base.css の 1024px 内 .dc-now--idle/.dc-now--lead の重複（計画由来）
- Task 4: minor (deferred): PC で .dc-screen の padding-bottom 32px が .dc-screen--focus の 16px に勝つ（見た目は S2 で確認）
- Task 4: minor (deferred): IconSprite の hidden div と svg display:none の二重
- Task 4: complete (commits 591fb30..d4677f4, review clean)
- Task 5: minor (deferred, 段3へ): formatCounts は不正なカウント文字列で例外（ルーティン編集で利用者の入力を渡すなら try/catch）
- Task 5: complete (commits d4677f4..864b225, review clean)
- Task 6: minor (deferred): displayLatencySeconds に数値を渡すと rAF 内で遅れて TypeError（呼び出し側は関数を渡す。Task 7 で確認）
- Task 6: minor (deferred): はじめの合図の間（elapsed<0）の遅れはテストで触れていない
- Task 6: complete (commits 864b225..8dd38b4, review clean)
- Task 7: Ruling (実装者の懸念: RED を記録していない): 受け入れる — コードは計画の逐語で、計画者スクラッチと通し稽古で RED（Cannot find module）を確認済み — 外れてもテストが本物の振る舞いを見ているかはレビューで確かめる
- Task 7: Ruling (Important 1, plan-mandated: begin() 内で compileRhythm/engine.start が投げると WakeLock が漏れ starting のまま): 直す — try/catch で idle に戻し（notice は 'stopped'）、ロックを解放、play の Promise は reject させない。テスト1件 — 外れても例外時の表示が変わるだけ。
- Task 7: Ruling (Minor 1・2・3・4 を同じ修正便に含める): (1) WakeLock 取り直し中に release されたら新しい sentinel を即解放（実機で停止後も画面が消えない事故） (2) 2秒判定は engine.start 直後に仕掛け、WakeLock の結果は判定時に読む（取得が遅い・止まると警告が出ない結合を断つ。判定時に未確定なら案内は出さない） (3) dispose で audio/engine を外す (4) outputLatencySeconds の 0〜0.5 判定を純粋テストで固定 — どれも小さく、段2の実機確認で踏む経路なので今直す — 外れても数行の差し戻し。
- Task 7: fix round 1/5 (5 addressed, 0 open — 開始失敗時の解放・WakeLock 取り直しの取りこぼし・2秒判定の先行・dispose・outputLatency テスト; commits 04bb3c0..a6df364)
- Task 7: minor (deferred): WakeLock 取り直し後の解放はコードを読んでの確認のみ（実機確認で見る）
- Task 7: complete (commits 8dd38b4..a6df364, review clean after 1 fix round). テスト件数は計画＋8（T8〜=221）
- Task 8: minor (deferred): forcedDismissed が戻らず、同じ S2 でハッシュの ui-state だけ変えても強制表示が再び出ない（開発用の状態のみ・再読み込みで出る）
- Task 8: minor (deferred): 再描画前の連打で change/toggle が古い settings を使う（保存は current ref で正しい）
- Task 8: minor (deferred, 段8へ): .dc-countbox の aria-label は role なしの div で読まれない
- Task 8: minor (deferred): change/togglePlay の session.play は try/catch なし（同期例外は起きない入力のみ）
- Task 8: minor (deferred, 実機確認へ): 前回カードの即再生は S2 のマウント後（タップの外）に play — 解除はカードのタップ内で済ませる設計。iPhone で確認
- Task 8: complete (commits a6df364..b2337ab, review clean)
- Task 9: ⚠️ resolved by controller: S11 の「もう一度 ▶」は文（Ruling 27-b「静的3項目＋もう一度 ▶ を押してください」どおり）。古い lastDanceId は normalizeSettings が DANCE_PROFILES で弾くので resume の印が残る経路はない
- Task 9: minor (deferred): HomeScreen の DANCE_PROFILES キャストと templates[0]! ／ タイル順がオブジェクトのキー順依存 ／ ラジオ行の矢印キー操作なし（段8）／ smoke の 4 秒固定
- Task 9: complete (commits b2337ab..5e91218, review clean)
- Task 10: Ruling (Important 1, plan-mandated: U3 が同じ固定バー内の組も飛ばす): 直す — 除外は「固定バーと本文」の組だけ（計画者の発見 #3(b) の理由の範囲）。同じバーの中の組（タブ同士・帯の中）は測る — 外れても誤検出で気づく。
- Task 10: Ruling (Important 2, plan-mandated: U10 が文字列ごとに数えるので折り返しが2か所あっても通る): 直す、ただし「ボタン全体の行の位置を数える」案は前回カード（前回／ワルツ／続きから の3位置・折り返しなし）を誤検出するので採らない。規則は「各文字列は2行まで」に加えて「ボタン全体で折り返しは1回まで（Σ(各文字列の行数−1) ≤ 1）」＝仕様の「ボタン文言は最大2行」を折り返しの数として読む — 外れたら段8で仕様の言い回しを Fable に確認。
- Task 10: Ruling (Important 3, plan-mandated: aria-hidden の中の見える文字が U1/U7/U10 から漏れる): 直す — 仕様 U1 は「可視テキスト」で、読み上げの有無は関係ない。aria-hidden による除外を外す（見えない要素は visible() が既に除く）— 外れても誤検出で気づく。
- Task 10: Ruling (Minor 1 を同じ便に含める): S2 くわしく開 の状態で details が本当に開いたことと全体の主要操作数＝8（Ruling 31）を確かめる — 開かずに弱い検査になる穴を塞ぐ安い修正。
- Task 10: minor (deferred): U9 の拡大検査が prepare/openMore を無視・console を拾わない／U5 の .dc-choice 未検査（未使用）／Ruling 23 の本文3行以内は高さだけで代用／for なし label 内の input が U3 対象外（未使用）
- Task 10: fix round 1/5 (4 addressed, 0 open — U3 同一バー内・U10 折り返し1回・aria-hidden 除外撤去・くわしく開の合計8; commits 9dc8f88..e3c9a9b)
- Task 10: minor (deferred): 厳しくした検査の後、公開ビルド（4174）での ui:check は未再実行（Task 11 で実行）
- Task 10: complete (commits 5e91218..e3c9a9b, review clean after 1 fix round)
