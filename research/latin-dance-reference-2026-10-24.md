# ラテン18曲の参照表とSuno制作案

**追記: 音源の取得と拍・周期の機械解析は実施した。最新は[実施状況](./audio-analysis-status-2026-10-24.md)。以下は初稿時点の整理と制作案で、楽器・旋律の実音分析は引き続き未完了。**

作成: 2026-10-24／うさこ・ひちゃん

**状態: 概要欄の整理と制作案まで。18曲の実音分析は未実施。**

対象: [ラテン版の参照動画](https://www.youtube.com/watch?v=6j4KM0y17OI)。曲名・時間・種目・テンポ・演奏者は、ひちゃんが提供した概要欄から整理した。投稿者の表示値であり、音源を測った数値ではない。歴史についての文章は、今回の作曲分析の根拠に使っていない。

基本方針・実音確認シート・Suno公式資料は[スタンダード版](./standard-dance-reference-2026-10-24.md)にまとめた。現接続ではうさこに再生音が届かないため、曲別の実際の楽器や旋律は未確認。以下の楽器・旋律は**オリジナル曲を作るための提案**であり、この18演奏から聴き取った結果ではない。

## テンポ換算

`MPM` は小節/分、`BPM` はここでは四分音符の拍/分。SunoにはBPMと拍子を併記する。

| 種目 | 換算に使う拍子 | 概要欄の小節/分 | 四分音符BPM | 1小節の長さ（計算値） |
|---|---|---:|---:|---:|
| ルンバ | 4/4 | 25 | 100 | 2.400秒 |
| チャチャチャ | 4/4 | 30 | 120 | 2.000秒 |
| サンバ | 2/4 | 50 | 100 | 1.200秒 |
| ジャイヴ | 4/4 | 42 | 168 | 約1.429秒 |
| パソドブレ | 2/4 | 59 | 118 | 約1.017秒 |

これは指定した拍子での算術換算。参照音源の実際の拍子・採譜・速さを確認した結果ではない。ルンバとサンバは同じ100 BPMでも、拍子と伴奏の作りが異なる。テンポの数字だけでは種目を指定できない。

### アプリとパソドブレの小節の扱い

現在の `src/engine/dance-profiles.js` は、パソドブレを**4拍/小節・四分音符単位**で管理している。一方、この資料の制作案は2/4で59小節/分とした。

- 2/4・59小節/分 = 四分音符118 BPM。
- 同じ拍を4拍のグループにまとめると、29.5グループ/分。
- 59にアプリの4を無条件に掛けて236 BPMとするのは、この2/4の換算とは一致しない。
- 音楽の2拍の小節とアプリの4拍のまとまりをどう対応させるかは、実音と仕様の確認が必要。資料の作成だけでコードや拍地図の定義を変更しない。

## 18曲の参照表

演奏者略号（スタンダード版と共通）:

- A: 須藤久雄とニュー･ダウンビーツ
- B: 有馬徹とノーチェ･クバーナ
- C: 森寿男とブルー･コーツ

開始時刻は概要欄の値。チャプター先頭が音楽の1拍目とは限らない。**全18曲の主旋律・楽器・伴奏・実測BPM・初心者適性は実音未確認**。右端は新規作曲用テンプレートの対応。

| # | 開始 | 曲名 | 概要欄の種目 | 小節/分 | 換算BPM | 演奏者 | 制作案 |
|---:|---|---|---|---:|---:|:---:|---|
| 01 | 00:00 | ひまわり | Rumba | 25 | 100 | A | R100 |
| 02 | 02:55 | アル•ディ•ラ | Rumba | 25 | 100 | A | R100 |
| 03 | 05:43 | 黒いオルフィ | Rumba | 25 | 100 | C | R100 |
| 04 | 08:31 | マイ•ウエイ | Rumba | 25 | 100 | B | R100 |
| 05 | 11:23 | 夜霧のしのび逢い | Rumba | 25 | 100 | C | R100 |
| 06 | 14:10 | ティー•フォー•トゥ | cha cha cha | 30 | 120 | B | C120 |
| 07 | 16:28 | エーゲ海の真珠 | cha cha cha | 30 | 120 | A | C120 |
| 08 | 18:45 | ラメント•ボリンカーノ | cha cha cha | 30 | 120 | B | C120 |
| 09 | 21:05 | 雨に歌えば | cha cha cha | 30 | 120 | C | C120 |
| 10 | 23:29 | フレネシ | cha cha cha | 30 | 120 | B | C120 |
| 11 | 25:51 | ブラジリアン•カーニバル | Samba | 50 | 100 | C | S100 |
| 12 | 27:58 | エル•クンバンチェロ | Samba | 50 | 100 | B | S100 |
| 13 | 30:06 | 愛のテーマ | Samba | 50 | 100 | A | S100 |
| 14 | 32:10 | シェリト•リンド | Samba | 50 | 100 | B | S100 |
| 15 | 34:17 | サウス•オブ•ザ•ボーダー | Jive | 42 | 168 | B | J168 |
| 16 | 36:47 | アマポーラ | Jive | 42 | 168 | B | J168 |
| 17 | 38:56 | ビッグ•バックス | Jive | 42 | 168 | A | J168 |
| 18 | 40:41 | エスパニア•カーニ | Paso Doble | 59 | 118 | B | P118 |

内訳はルンバ5・チャチャチャ5・サンバ4・ジャイヴ3・パソドブレ1。

## ラテンのカウント練習用に分けたいこと

ここでは既存アプリのテンプレートを記す。各団体・全フィガー共通の公式カウントと認定したものではない。

| 種目 | アプリにある表記 | 作曲・確認への反映 |
|---|---|---|
| ルンバ | `2341` | 音楽の1拍目と、最初に発声する「2」を区別する。旋律の出だしを1拍目と決めつけない |
| チャチャチャ | `234&1` | 四分音符の拍を聞ける伴奏を残し、4と次の1の間にある半拍も追いやすくする |
| サンバ | `1a2` / `SQQ` | 2拍のまとまりを残す。`a`と`&`を同じ長さとして扱わず、細かい打楽器すべてを足の拍とみなさない |
| ジャイヴ | `123a45a6` | 6カウントのフィガーと4拍子の小節を混同しない。曲を6/4へ変える指示にはしない |
| パソドブレ | `1234` / `12345678` | 曲側の2拍小節とアプリ側の4拍グループの対応を確認してから合わせる |

楽器の音型と身体のステップは一対一とは限らない。特にラテンでは、打楽器の細かい音型と大きな拍の両方がある想定で、初心者がどの層を追えばよいかを確認する。

## Suno用の5つの制作案

**以下は参照18曲の音色を再現したものではなく、初心者向けのオリジナル作曲案。** Instrumentalを使い、Stylesに入力する想定。指定BPM・拍子・小節数どおりに生成されたかは別途確認する。

### R100: 旋律が長くても拍を追えるルンバ

提案楽器: ナイロン弦ギター、ピアノ、コントラバス、控えめなコンガ・シェイカー、薄い弦。

旋律の提案: 少ない音で歌うレガート。フレーズの末尾を伸ばしても伴奏を止めない。下の「1拍目を分かりやすく」は、足を1から始める指定ではなく、音楽上の小節位置を示すためのもの。

```text
Instrumental international ballroom rumba for beginner practice, 4/4 meter, steady 100 BPM, quarter-note pulse, 25 measures per minute. Warm acoustic dance orchestra with nylon-string guitar carrying an original lyrical melody, restrained piano, upright bass, soft congas, a light shaker and sparse strings. Gentle expressive melodic lines over a continuous clearly audible quarter-note accompaniment. Make the musical downbeat recognizable without turning the groove into a march. Clear four-bar phrases and eight-bar cadences. Two-bar rhythmic introduction. Tender and flowing, moderate dynamics, spacious clean mix with short reverb and room for spoken dance counts added later. About two minutes. Original composition.
```

### C120: 拍と半拍の区別をしやすいチャチャチャ

提案楽器: ピアノ、コントラバス、ギロ、コンガ、ティンバレス、短いブラス。

旋律の提案: 短い問いと答え。主旋律は詰め込まず、ピアノと打楽器の細かい音型が大きな4拍を覆わないようにする。

```text
Instrumental international ballroom cha-cha-cha for beginner practice, 4/4 meter, steady 120 BPM, quarter-note pulse, 30 measures per minute. Bright acoustic Latin dance band with rhythmic piano, upright bass, guiro, soft congas, restrained timbales and short brass responses. Original concise call-and-response melody. Keep the four quarter-note beats clear, with light eighth-note percussion making the subdivision between beat four and the next beat one easy to follow. Preserve the cha-cha-cha character without dense percussion fills. Clear four-bar phrases and eight-bar cadences. Two-bar rhythmic introduction. Playful and crisp, controlled dynamics, clean dry mix with space for spoken counts added later. About two minutes. Original composition.
```

### S100: 2拍の土台が聞こえるサンバ

提案楽器: 低音のスルド、軽いシェイカー、控えめなタンボリン、ギター、ピアノ、短いブラス。

旋律の提案: 短く弾むフレーズ。2拍の低音を手掛かりとして残しつつ、打楽器にはサンバらしい複合的な動きを持たせる案。細かい音をすべて強く鳴らす指定にしない。

```text
Instrumental international ballroom samba for beginner practice, 2/4 meter, steady 100 BPM, quarter-note pulse, 50 two-beat measures per minute. Buoyant acoustic Latin dance band with a clear low surdo foundation, light shaker, restrained tamborim, rhythm guitar, piano and short warm brass phrases. Original playful melody in compact repeated phrases. Keep the two main beats easy to hear beneath the syncopated percussion, with a recognizable first beat and a stable two-beat foundation. Clear four-bar phrases and eight-bar cadences. Two-bar rhythmic introduction. Lively and springy rather than frantic, moderate dynamics, uncluttered clean mix, space for spoken counts added later. About two minutes. Original composition.
```

### J168: 速い旋律に埋もれないジャイヴ

提案楽器: ブギ系ピアノ、コントラバス、控えめなドラム、短いサックス・ブラス。

旋律の提案: 記憶しやすい短いリフと応答。ベースが四分音符を保ち、2・4拍のバックビートは聞こえるが強すぎない案。これは参考曲15〜17の実際のリズムを確認した記述ではない。

```text
Instrumental international ballroom jive for beginner practice, 4/4 meter, steady 168 BPM, quarter-note pulse, 42 measures per minute. Cheerful acoustic swing dance band with boogie-style piano, walking upright bass, restrained drums, short saxophone riffs and light brass responses. Original short memorable melodic hooks with a lively shuffle feel. Keep every quarter-note bass pulse distinct; give beats two and four a clear but controlled backbeat. Clear four-bar phrases and eight-bar cadences. Two-bar rhythmic introduction. Energetic and buoyant without long solos or heavy fills, clean lightly reverberant mix with room for spoken counts added later. About two minutes. Original composition.
```

### P118: 大きな構成の前に拍を覚えるパソドブレ

提案楽器: トランペット、低音ブラス、スネア、低音楽器、控えめなスペイン風ギター。

旋律の提案: 拍頭の明確な短いファンファーレ。最初の制作案では停止やテンポ変更を入れず、一定の拍を学ぶ目的とする。

参照曲「エスパニア•カーニ」の固有の旋律や展開を確認・再現したものではない。一定8小節の新曲を作れても、特定曲のハイライトやデモ用の振付と同じ構造とは扱わない。

```text
Instrumental international ballroom paso doble for beginner pulse practice, 2/4 meter, steady 118 BPM, quarter-note pulse, 59 two-beat measures per minute. Acoustic Spanish-flavored dance orchestra with clear trumpet fanfares, warm low brass, restrained snare, a firm low bass foundation and sparse Spanish guitar. Original concise melody with unmistakable phrase beginnings. Distinct alternating two-beat march pulse, clear first beats, continuous accompaniment and controlled accents. Clear four-bar phrases and eight-bar cadences. Two-bar rhythmic introduction. Proud and dramatic with moderate dynamics, clean detailed mix and space for spoken counts added later. Maintain the same pulse throughout. About two minutes. Original composition.
```

### 共通Exclude案

```text
vocals, spoken words, counting voice, scat, choir, rubato, tempo changes, meter changes, long ambient intro, stop-time breaks, extended drum solos, dense improvised solos, heavy reverb, EDM drops
```

原曲の実音分析が完了したら、各曲の違いが分かる根拠区間を付けて、この種目別案から曲別案へ展開する。曲名だけから調や楽器を割り当てない。

## 次の確認

- 36曲の音源に対応するファイルを特定する。音源原本を変更しない。
- 実音を機械解析し、概要欄のテンポとの差・半分/倍候補・小節頭候補を記録する。
- 旋律、音色、リズムの聞き取りには実際の試聴所見が必要。機械の拍推定だけで聴き取り済みにしない。
- 原曲の特徴の記述と、オリジナル曲で採用したい編曲を分ける。
- 生成曲をアプリに登録する前に、音楽上の拍と実際のカウント音声の入りを確認する。

アプリ実装・カタログ登録・既存ファイルの変更、Sunoでの生成・アップロード・公開は行っていない。

## 出典

- 曲目情報: ひちゃん提供の概要欄（2026-10-24）。[ラテン版の参照動画](https://www.youtube.com/watch?v=6j4KM0y17OI)。
- BPM・拍子・音楽用語: [Suno公式 Music Glossary](https://help.suno.com/en/articles/9010177)。
- 入力の方法: [Suno公式 Custom Mode](https://help.suno.com/en/articles/3726721)、[Exclude](https://help.suno.com/en/articles/3161921)。
- 現在のアプリ内の値: `src/engine/dance-profiles.js`（2026-10-24確認）。規則の正しさではなく、現実装を説明する根拠。
