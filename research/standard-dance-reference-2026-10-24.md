# 社交ダンス18曲の参照表とSuno制作案

**追記: 音源の取得と拍・周期の機械解析は実施した。最新は[実施状況](./audio-analysis-status-2026-10-24.md)。以下は初稿時点の整理と制作案で、楽器・旋律の実音分析は引き続き未完了。**

作成: 2026-10-24／うさこ・ひちゃん

**状態: 概要欄の整理と制作案まで。18曲の実音分析は未実施。**

## この資料で確認できたこと

- 対象: [社交ダンス•ミュージック（スタンダード編）高音質CD音源](https://www.youtube.com/watch?v=pyYy74hRsVc)、Tnk Ysfm。
- 曲名・種目・テンポ表示・演奏者は、ひちゃんが提供した概要欄に基づく。投稿者の記載内容として扱い、原盤のクレジット照合はしていない。
- Chromeの画面と概要欄は確認できたが、この接続では再生音が音声入力として届かない。曲ごとの主旋律、実際の楽器、調、拍位置、実測BPMは未確認。「聴いて抽出した特徴」として推測を埋めない。
- 下の楽器・旋律・構成の指定は、Dance Count用に新しく曲を作るための提案。参考演奏の採譜・楽器同定結果ではない。
- アプリの現状は `HANDOFF.md`、`docs/app-v1/HANDOVER.md`、制作工程は `tools/music-probe/README.md` を参照した。アプリが拍地図へ音声を合わせる設計であることを踏まえ、声と競合しにくいインスト案とする。

## テンポの単位

この概要欄の「テンポ」は**1分間の小節数**。ここでは `MPM` と書く。Suno公式用語集の `BPM` は**1分間の拍数**なので、同じ数字をそのまま渡さない。

```text
四分音符BPM = 小節/分 × 1小節に含まれる四分音符の数
```

| 種目 | 制作案の拍子 | 概要欄の小節/分 | 四分音符BPMへの換算 | 1小節の長さ（計算値） |
|---|---|---:|---:|---:|
| ワルツ | 3/4 | 28 | 84 | 約2.143秒 |
| ワルツ | 3/4 | 29 | 87 | 約2.069秒 |
| タンゴ | 4/4 | 32 | 128 | 1.875秒 |
| スローフォックス | 4/4 | 28 | 112 | 約2.143秒 |
| クイックステップ | 4/4 | 48 | 192 | 1.250秒 |

数値は概要欄からの換算であり、音源を測定した結果ではない。タンゴは2/4・2拍の捉え方もあるため、今回の制作案ではプロジェクトの4拍/小節に合わせて四分音符128 BPMと明記する。原盤の譜面の拍子を確認したという意味ではない。自動解析でも半分・倍のテンポ候補が出ることがあるので、数値だけで正解としない。

また、`Slow` / `Quick` はステップの時間配分であり、音楽のすべての拍をそのまま一歩ずつ踏むという意味ではない。作曲では一定の拍を用意し、フィガーのカウントはアプリで重ねる。

## 18曲の参照表

開始は概要欄のチャプター位置。次曲の開始直前までを確認対象とするが、実際の演奏開始・無音・ジングルとの境界は未測定。

演奏者略号:

- A: 須藤久雄とニュー•ダウンビーツ
- B: 有馬徹とノーチェ•クバーナ
- C: 森寿男とブルー•コーツ

**全18曲共通で、旋律の形・実際の主役楽器・伴奏パターン・実測テンポ・カウントの取りやすさの実音判定は未確認。** 右端は原曲の特徴の断定ではなく、制作に使えるテンプレートへの対応。

| # | 開始 | 曲名 | 概要欄の種目 | 小節/分 | 換算BPM | 演奏者 | 制作案 |
|---:|---|---|---|---:|---:|:---:|---|
| 01 | 00:00 | 魅惑のワルツ | Waltz | 28 | 84 | A | W84 |
| 02 | 02:38 | ロシアより愛をこめて | Waltz | 28 | 84 | A | W84 |
| 03 | 05:11 | エーデル•ワイス | Waltz | 29 | 87 | A | W87 |
| 04 | 07:38 | チ•マイ | Waltz | 29 | 87 | A | W87 |
| 05 | 10:14 | 過ぎし夏のワルツ | Waltz | 28 | 84 | A | W84 |
| 06 | 12:45 | ラ•クンパルシータ | Tango | 32 | 128 | B | T128 |
| 07 | 14:56 | バンドネオンの嘆き | Tango | 32 | 128 | B | T128 |
| 08 | 17:07 | キッス•オブ•ファイア | Tango | 32 | 128 | A | T128 |
| 09 | 19:20 | ジーラ•ジーラ | Tango | 32 | 128 | B | T128 |
| 10 | 21:34 | フェリシア | Tango | 32 | 128 | A | T128 |
| 11 | 23:47 | スターダスト | Fox Trot | 28 | 112 | C | F112 |
| 12 | 26:21 | ハワイアン•ウエディング•ソング | Fox Trot | 28 | 112 | B | F112 |
| 13 | 28:53 | 第三の男 | Fox Trot | 28 | 112 | A | F112 |
| 14 | 31:23 | モン•パリ | Fox Trot | 28 | 112 | A | F112 |
| 15 | 33:52 | スマイル | Fox Trot | 28 | 112 | A | F112 |
| 16 | 36:23 | ズィング［ウェント•ザ•ストリングス•オブ•マイ•ハート］ | Quick | 48 | 192 | A | Q192 |
| 17 | 38:34 | Shall We Dance「王様と私」より | Quick | 48 | 192 | A | Q192 |
| 18 | 40:45 | レッツ•ダンス | Quick | 48 | 192 | C | Q192 |

内訳はワルツ5・タンゴ5・フォックストロット5・クイックステップ3。この18曲にはジャイヴとヴィエニーズワルツは記載されていない。「ワルツからジャイヴまで」という概要欄の文章から、収録種目を追加しない。

## 初心者向けの曲にしたい条件（制作上の仮説）

ひちゃんの「カウントを取りやすい」という印象を、以下の観点で実音と照合する。現段階でこの18演奏すべてが満たすと判定したわけではない。

| 観点 | 作曲・編曲で指定すること | 実音で確かめたいこと |
|---|---|---|
| 1拍目が分かる | 小節頭の低音を、他の拍と区別できる音色・音価にする | 旋律が伸びていても1拍目を追えるか |
| 拍を見失わない | ベース・ピアノ・ドラムのいずれかが拍を継続する | 弱音部・間奏・フィルでも拍が残るか |
| 旋律に引っ張られすぎない | 長い旋律と短い伴奏を分ける。初期案は弱起や裏拍の強調を控える | 旋律の入りを小節頭と誤解しないか |
| 次の区切りを予測できる | 4小節のまとまりと8小節の区切りを分かりやすくする | 余分な1小節・途中の拍抜けがないか |
| カウント音声が聞こえる | 主旋律を詰め込みすぎず、過度な残響を避ける | アプリの声と楽器が重なる場面でも語頭を聞けるか |
| 聴き続けたい | 旋律と和声には表情を持たせ、伴奏の拍は安定させる | 拍の明瞭さと音楽の楽しさが両立するか |

「すべての拍を同じ強さで鳴らす」ことは目標にしない。ワルツの3拍、タンゴの歯切れ、フォックスの流れ、クイックの軽さを残して試す。これらは作曲案の評価観点で、団体の公式認定基準ではない。

## Sunoへ渡す制作案

以下は**原曲を聴いて再現したプロンプトではない**。種目と目標テンポに、初心者用の伴奏設計を加えた新規作曲案。参考曲名・演奏者名・原曲の旋律はプロンプトに入れず、別のオリジナル旋律を作る指示にする。

Suno公式はCustomでInstrumentalを選び、Stylesにスタイルを指定する流れを案内している。不要な要素を指定する場合はAdvanced OptionsのExcludeを使う。画面の名称・配置は使用中の版で確認する。

以下のBPM・拍子・小節数は目標指定であり、生成結果の保証ではない。歌詞欄に説明文を入れて歌わせるのではなく、基本はInstrumentalとStylesで試す。

### W84: 3拍の伴奏が分かるスローワルツ

狙い: 旋律はなめらか、伴奏は「1・2・3」を追える。1拍目の低音と2・3拍目の和音を音の役割で区別する。

提案楽器: コントラバス、ピアノ、薄い弦、柔らかい木管、控えめなブラシ。

旋律の提案: 小さな音程移動を中心に、2〜4小節の歌えるまとまり。句の終わりの長い音でも伴奏は継続。楽器の表情を、テンポを大きく動かす方法に頼らず作る。

```text
Instrumental English slow ballroom waltz for beginner dance practice, 3/4 meter, steady 84 BPM, quarter-note pulse, 28 measures per minute. Warm acoustic dance orchestra: upright bass on beat one, light piano chords on beats two and three, soft strings and a gentle woodwind lead. Original lyrical melody with mostly stepwise movement, clear four-bar phrases and eight-bar cadences. Keep all three accompaniment beats audible under sustained melody notes. Two-bar rhythmic introduction, then maintain the same pulse throughout. Graceful and warm, restrained dynamics, clear acoustic separation, short room reverb, leave space for a spoken counting voice to be added later. About two minutes. Original composition.
```

### W87: 少し速いスローワルツ

W84の `84 BPM` を `87 BPM`、`28 measures per minute` を `29 measures per minute` に置き換える。他条件を揃えて、速度によるカウントの取りやすさを比較する。原曲03・04の楽器や旋律がW84と同じという意味ではない。

### T128: 拍が残る歯切れのよいタンゴ

狙い: 短く切る音と音の隙間を作りつつ、低音・伴奏から4拍を追える。劇的な旋律に引っ張られてカウントを見失わない構成を試す。

提案楽器: バンドネオンまたはアコーディオン系リード、短い弦、ピアノ、コントラバス、控えめなスネア。

旋律の提案: 短い動機と応答。初期案は拍上の入りが明確なもの。旋律が休む間も伴奏の拍を維持する。楽器はこの制作案の選択であり、参照曲06〜10の実際の編成ではない。

```text
Instrumental English ballroom tango for beginner practice, 4/4 meter, steady 128 BPM, quarter-note pulse, 32 four-beat measures per minute. Acoustic dance orchestra with a restrained bandoneon lead, short bowed-string accents, crisp piano, upright bass and light snare. Original compact melodic motifs with clear phrase beginnings. Mark every quarter-note beat in the accompaniment and make beat one easy to recognize; keep rhythmic articulation sharp without overwhelming the pulse. Clear four-bar phrases and eight-bar cadences. Two-bar rhythmic introduction, continuous accompaniment through melodic pauses. Poised, dramatic and controlled, moderate dynamics, dry detailed mix, leave room for spoken counts added later. About two minutes. Original composition.
```

### F112: 流れる旋律と一定の4拍を分けるスローフォックス

狙い: 旋律の長い線と、4拍を示すベース・ドラムを分ける。初心者が旋律の音数を拍数と取り違えないかを試す。

提案楽器: 柔らかいサックス、ピアノ、コントラバス、ブラシ、薄い弦。

旋律の提案: ゆったりしたレガートと短い応答。装飾・即興ソロは控える。スウィング感を残しつつ、四分音符の拍を追いやすくする。

```text
Instrumental English slow foxtrot for beginner ballroom practice, 4/4 meter, steady 112 BPM, quarter-note pulse, 28 measures per minute. Warm acoustic dance band with mellow saxophone, light piano, an even walking upright bass, quiet brushed drums and sparse strings. Original smooth legato melody with simple singable phrases and restrained ornamentation. Gentle swing feel, clearly audible quarter-note bass pulse, recognizable beat one, accompaniment continuing underneath held notes. Clear four-bar phrases and eight-bar cadences. Two-bar rhythmic introduction. Relaxed, elegant and flowing, moderate dynamics, clean lightly reverberant mix with space for a spoken counting voice added later. About two minutes. Original composition.
```

### Q192: 速くても拍を見失いにくいクイックステップ

狙い: 細かい音を増やすより、低音の拍と短い和音の輪郭を出す。数字上192 BPMでも、半分の速さに聞こえるだけの伴奏になっていないか確認する。

提案楽器: クラリネットまたはサックス、短いブラス、リズムギター、ピアノ、コントラバス、軽いドラム。

旋律の提案: 短く覚えやすいモチーフ。軽快さを出しつつ、長い高速ソロや大きなフィルを避ける。この192 BPMは概要欄の換算値であり、初心者全員に適した開始速度という認定ではない。

```text
Instrumental English ballroom quickstep, 4/4 meter, steady 192 BPM, quarter-note pulse, 48 measures per minute. Bright acoustic swing dance band: nimble clarinet lead, short brass responses, light rhythm guitar and piano, upright bass marking every quarter note, crisp restrained drums. Original short catchy melodic motifs and clear phrase beginnings. Lively but uncluttered, distinguishable beat one, continuous quarter-note accompaniment rather than a half-time groove. Clear four-bar phrases and eight-bar cadences. Two-bar rhythmic introduction. Buoyant, playful and elegant, controlled dynamics, clean detailed mix, short reverb and space for spoken counts added later. About two minutes. Original composition.
```

### 共通Exclude案

```text
vocals, spoken words, counting voice, scat, choir, rubato, tempo changes, meter changes, long ambient intro, stop-time breaks, extended drum solos, dense improvised solos, heavy reverb, EDM drops
```

これは生成時の希望。各項目が必ず排除されるとは扱わない。カウント音声はSunoに生成させず、既存アプリの声を後から重ねる想定。

## 実音が用意できた後の曲別分析

各曲につき、冒頭だけでなく「主旋律の提示」「中間部」「終盤」を確認し、タイムスタンプを付けて次の形式で埋める。

```text
対象曲番号／曲名:
音源ファイル／SHA256:
確認区間（動画全体時刻と曲内時刻）:
概要欄のテンポ／実測BPM／推定拍子:
テンポの半分・倍候補と採否理由:
最初の完全な小節の1拍目／弱起の有無:
拍を支える楽器とパターン:
主役の音色（楽器名の確度も記録）:
旋律（音域・音程移動・音価・弱起・裏拍・反復）:
和声と調（確認できた範囲だけ）:
句と区切り（何小節ごとか）:
カウントを取りやすい理由と、その根拠区間:
難しい箇所（休止・フィル・弱音・ジングル等）:
元演奏の特徴から新曲に使いたい要素:
新曲で変えたい要素:
曲別Sunoプロンプト:
根拠区分（実測／試聴者の所見／推定／制作提案）:
未確認事項:
```

ローカル音源があれば、既存の `tools/music-probe/analyze-bars.py` で拍・小節頭候補を推定できる。ワルツは3拍、今回の他3種目は制作案の4拍を仮説として使う。解析先は既存の結果と分けて指定し、原本は書き換えない。モデルの出力は候補であり、楽器名・旋律の美的特徴・初心者適性を確定するものではない。

現接続でうさこは直接の聴覚確認をしていない。音源入手後に機械解析ができても、実音の楽器・旋律について確認できない点は残す。ひちゃんの試聴メモなどと照合し、機械測定と人の所見を混ぜずに完成させる。

## 生成したオリジナル曲の採否

- 全曲のBPM・拍子・小節頭を確認し、イントロから曲末までのテンポ変化・拍抜けを調べる。プロンプトの数字を曲の実測値として登録しない。
- 音楽だけでひちゃんがカウントを取り、次にアプリの声を重ねて、頭が合うか・途中で迷わないか・声が聞こえるかを確かめる。
- 音楽の1拍目と、選んだフィガーの最初の発声位置を区別する。フィガーに合わせて音楽の小節頭をずらさない。
- 8小節等の区切りや2小節のイントロが生成されているか数える。必要な練習範囲を確定してからアプリへ登録する。
- 一定テンポで作っても、揺れが残る場合は実際の拍地図で同期する。機械推定の結果だけで初心者向け確認済みにしない。

この作業でアプリ実装、音楽カタログ、既存資料は変更していない。Sunoでの生成・アップロード・公開も行っていない。

## 出典

- 曲別メタデータ: ひちゃん提供のYouTube概要欄（2026-10-24）。[元動画](https://www.youtube.com/watch?v=pyYy74hRsVc)。
- BPMの意味と音楽用語: [Suno公式 Music Glossary](https://help.suno.com/en/articles/9010177)（2026-10-24取得）。
- Instrumental・Stylesの利用: [Suno公式 Custom Mode](https://help.suno.com/en/articles/3726721)（Android手順。本文でweb workflowと同じ流れと説明、2026-10-24取得）。
- 不要な要素の指定: [Suno公式 Exclude](https://help.suno.com/en/articles/3161921)（2026-10-24取得）。

Suno公式資料は入力方法・用語の根拠。今回の伴奏設計や、18曲の演奏内容を裏付ける出典ではない。
