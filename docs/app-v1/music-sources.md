# 同梱用BGM 調査メモ（社交ダンス カウント練習アプリ）

調査日: 2026-10-11 / 調査者: Sonnet 5.5（Web調査のみ・音源のダウンロードはしていない）
凡例: **[確認]** = 下記URLのページ本文で確認した / **[未確認]** = 確認できなかった・一般知識・要再確認

---

## 1. 標準テンポ（根拠）

出典（どちらもPDF本文から抽出して確認 **[確認]**）:
- WDSF Professional Division Competition Rules 2012（Rule 4付近 "The tempi for each dance shall be"）
  https://cdnb.worlddancesport.org/legacy-docs/wdsf/PD/WDSF%20Professional%20Division%20Competition%20Rules%20%202012.pdf
- 補助: スロバキア協会ルール 2009年版（"From January 1, 2009 the following tempi are allowed"、同一の表）
  https://archiv.szts.sk/files/documents/legislativa/20090120_SDSF_rules.pdf

注意: WDSFのPDFは**2012年版（Professional Division）**。現行のAmateur/Adult規則での再確認は **[未確認]**。ただし2009年版・2012年版・ポーランド協会2022年版で数値は一致しており、長年安定した値。

| ダンス | 拍子 | WDSF規定 (小節/分 = MPM) | 換算BPM（四分音符。Samba/Pasoは2/4なので小節×2、4/4は×4、3/4は×3） |
|---|---|---|---|
| Waltz | 3/4 | 28–30 | 84–90 |
| Tango | 4/4 | 31–33 | 124–132 |
| Viennese Waltz | 3/4 | 58–60 | 174–180 |
| Slow Foxtrot | 4/4 | 28–30 | 112–120 |
| Quickstep | 4/4 | 50–52 | 200–208 |
| Rumba | 4/4 | 25–27 | 100–108 |
| Cha-cha-cha | 4/4 | 30–32 | 120–128 |
| Samba | 2/4 | 50–52 | 100–104 |
| Paso Doble | 2/4 | 60–62 | 120–124 |
| Jive | 4/4 | 42–44 | 168–176 |

（拍子・BPM換算は私の計算。拍子の記載自体はWDSFの表にはない。）
参考: 2009年スロバキア規則には演奏時間規定もある（Viennese Waltzは1〜1.5分、他は1.5〜2分）[確認]。

---

## 2. ソース別ライセンス表

### 2-1. Incompetech（Kevin MacLeod）
| 項目 | 内容 |
|---|---|
| URL | https://incompetech.com/music/royalty-free/ ／ FAQ https://incompetech.com/music/royalty-free/faq.html |
| ライセンス | CC BY 4.0（無料）。帰属不要にしたい場合は有償「Standard License」 **[確認]** FAQ・licensesページ |
| 帰属 | 必須。FAQの形式: "Licensed under Creative Commons: By Attribution 4.0" ＋ 曲名・作者。クレジットは隠さないこと。改変した場合はどの部分が自分の手によるかを明示 **[確認]** FAQ |
| 商用 | CC BY 4.0自体が商用可 **[確認]** https://creativecommons.org/licenses/by/4.0/ 。FAQは「Probably. Be sure to credit me」とだけ書く（アプリは言及なし） |
| アプリ同梱 | FAQはアプリ・ファイル再配布に言及なし。ただしCC BY 4.0本文は「あらゆる媒体・形式での複製・再配布を商用も含め許諾」 **[確認]** CC deed。「スタンドアロン再配布禁止」の条項は見当たらない **[確認: FAQ・licensesページに記載なし]** |
| 注意 | "All of this music is copyrighted"（著作権放棄ではない）。カウント音声の重ね合わせはCC BYでは「改変（翻案）」に当たりうる→改変表示が必要。クレジット表示画面をアプリ内に必ず用意 |
| ジャンル検索 | Latin/Jazz/Classical/Polka等はあるが**Ballroom/Waltz/Tango区分は無く、BPM表示/フィルタも無い** **[確認]** |
| 判定 | 本命。権利条件が最も明快。テンポは自前で測る必要あり |

### 2-2. Pixabay Music
| 項目 | 内容 |
|---|---|
| URL | https://pixabay.com/service/license-summary/ ／ https://pixabay.com/service/terms/ |
| ライセンス | Pixabay Content License（CCではない独自ライセンス） **[確認]** |
| 帰属 | 不要（推奨） **[確認]** terms §6 |
| 商用 | 原則可。ただし商標・ロゴ・ブランドが写るContentは商用不可（音楽には通常無関係）**[確認]** |
| アプリ同梱 | **約款はアプリに言及なし** **[確認]**。**§5「Standalone（単体）での販売・配布禁止」**: "You cannot sell or distribute the Content ... on a Standalone basis"。音声ファイル(audio ... digital file)も対象。Standaloneは「創作的な加工がされていない」場合。他要素と組み合わせて「新しい創作物」になるなら可 **[確認]**。→ アプリ（カウント音声＋UI＋練習機能に組み込み）はおそらく「新しい創作物」だが、**音声ファイルがアプリ内に抽出可能な形で同梱される点がグレー**。この判断は**[未確認]**（Pixabayへの問い合わせまたは法務確認を推奨） |
| 注意 | 投稿者の自己申告型・AI生成曲が混在（Tech_Oasis等は2分固定の連番タイトルでAI生成の疑い、**[未確認]**）。Content IDに登録されうる点は約款に記載なし **[確認]**（不要な登録があるとの報告は別途あり、**[未確認]**）。ダウンロード時点のライセンスをスクリーンショット等で保存しておく |
| 判定 | ダンス名で曲が探しやすく候補は豊富。ただしstandalone条項のグレーが残るため、同梱前に問い合わせ推奨 |

### 2-3. Free Music Archive (FMA)
| 項目 | 内容 |
|---|---|
| URL | https://freemusicarchive.org/ ／ ライセンスガイド https://freemusicarchive.org/License_Guide ／ アプリ開発者 https://freemusicarchive.org/app-developers |
| ライセンス | 曲ごとに異なる: CC0 / CC BY / BY-SA / BY-ND / BY-NC 系 **[確認]** License_Guide |
| 商用 | CC0・BY・BY-SA・BY-NDは可、**NC系は不可** **[確認]** |
| アプリ同梱 | 自分のサーバー/アプリ内で自己ホストすることが条件（ホットリンク禁止）**[確認]** app-developers。同梱は自己ホストに該当すると思われるが明文なし。ライセンスガイドは"Apps: not addressed" **[確認]** |
| 注意 | **BY-ND はカウント音声を重ねる改変ができない**（"cannot put this song in a video or other derivative work"）→除外。BY-SA はアプリ全体への波及が議論になるため避ける。BY-NC除外。実質CC0かCC BYのみ使用 |
| 判定 | 曲ごとにページでライセンス確認が必須。検索結果ページはライセンスを一覧表示せず、今回は候補曲を特定できなかった |

### 2-4. Musopen
| 項目 | 内容 |
|---|---|
| URL | https://musopen.org/ |
| 状況 | サイト本体・FAQ・利用規約は**403でアクセスできず内容未確認** |
| 検索で得た間接情報 | 録音は「パブリックドメイン／CC0」として公開との説明がWikimedia Commons上のMusopen由来ファイルにある。Musopen自身の素材・サービスは別扱いで著作権あり、との記述もあり。FAQの旧文言に「利益目的の直接販売は控えて」「派生物にはMusopenを帰属」とのお願いがあるが法的条件かは不明 **[未確認・二次情報]** |
| Strauss録音 | Viennese Waltz用のStrauss録音がMusopenにあるか、CC0かは**今回確認できず** |
| 判定 | ブラウザで人手確認が必要。クラシック生演奏はテンポが揺れる（後述）。Viennese Waltz(58–60 MPM、約174–180BPM)の実演奏は多くがrubato |

### 2-5. Wikimedia Commons（Musopen経由のPD音源）
| 項目 | 内容 |
|---|---|
| 状況 | Musopen由来のoggがCommonsに多数あり、「musopen.comによりパブリックドメインとして公開、世界中で適用」の表記がある（Beethoven・Dvorak等で確認、**Strauss系は未発見**）|
| 判定 | 各ファイルページのライセンス表記が一次情報。候補発見には「Category:Johann Strauss II recordings」等を人手で探す必要あり **[未確認]** |

### 2-6. ccMixter
| 項目 | 内容 |
|---|---|
| URL | http://ccmixter.org/ |
| 状況 | about ページは404で**確認できず**。CC BY / CC BY-NC混在、曲ごとに異なると一般に理解されている **[未確認]** |
| 判定 | ダンスのテンポに合う素材探しは難しい。優先度低 |

### 2-7. Jamendo Music
| 項目 | 内容 |
|---|---|
| URL | https://www.jamendo.com/legal/creative-commons ／ https://www.jamendo.com/legal/terms |
| 状況 | ページがJS描画で本文が取得できず**確認不可** |
| 一般的理解 **[未確認]** | 無料で聴けるのは主に非商用(CC NC系)。商用利用は「Jamendo Licensing」の有償ライセンスが必要 |
| 判定 | 商用アプリ同梱には不向き（有償なら別途検討） |

### 2-8. YouTube Audio Library
| 項目 | 内容 |
|---|---|
| URL | https://support.google.com/youtube/answer/3376882 |
| 状況 | YouTube Studio内専用。「YouTube外での利用について法的助言はできない」と明記 **[確認]** |
| 判定 | **アプリ同梱には使えない**（YouTube外の利用許諾が不明）。除外 |

### 2-9. ダンス専用ライブラリ
- 検索で見つかったのは一般のストック音楽（Uppbeat、Proud Music Library、Musicfox等の"Ballroom"カテゴリ）のみ。**いずれも規約を読んでおらず [未確認]**。再配布・アプリ同梱の可否は不明。
- uk-ballroom.co.uk のダンス音楽ページ（https://uk-ballroom.co.uk/music/）はテンポ参考情報のみで、ライセンス内容は**[未確認]**（教材用リンクの可能性）。
- WDSF準拠のテンポで作られた**無償・同梱可**のダンス音源集は今回見つからなかった。

---

## 3. ダンス別 候補（最大3曲）

重要: 以下の**BPMはすべて未確認**（各サイトに表示なし）。曲名から推測できるだけなので、**採用前に必ず実測（オーディオ解析）してWDSFレンジに入るか確認**すること。曲のライセンスは各ソースの上記条件に従う。

| ダンス | 目標BPM | 候補 | ソース/ライセンス |
|---|---|---|---|
| Waltz | 84–90 | Pixabay「Jazz Waltz」Aurec 2:42 https://pixabay.com/music/modern-jazz-jazz-waltz-602643/ ／ Pixabay「Summer Waltz」Darren_Hirst 2:09 https://pixabay.com/music/modern-classical-summer-waltz-318168/ ／ Incompetech「Devonshire Waltz Moderato」「Starting Out Waltz Allegretto」(同サイト、URLは曲検索から) | Pixabay Content License / CC BY 4.0 |
| Tango | 124–132 | Pixabay「Tango」GerardDEP 2:25 https://pixabay.com/music/tango-tango-302837/ ／ Pixabay「Tango pour Annick」Jean-Paul-V 2:20 https://pixabay.com/music/tango-tango-pour-annick-288336/ ／ Incompetech「Tango de Manzana」 | 同上 |
| Viennese Waltz | 174–180 | Pixabay「Vienna Waltz Classical European Orchestral Ballroom Historical」Denis-Pavlov-Music 1:54 https://pixabay.com/music/modern-classical-vienna-waltz-classical-european-orchestral-ballroom-historical-449984/ ／ Pixabay「Waltz Golden Hall」EchoWaveMutawe 3:31 https://pixabay.com/music/modern-classical-waltz-golden-hall-552115/ ／ Musopen系Strauss（所在・テンポ未確認） | 同上 / Musopenは要確認 |
| Slow Foxtrot | 112–120 | Pixabay「Foxtrot Music - Dancing with the Stars」Tech_Oasis 2:00 https://pixabay.com/music/show-dance-foxtrot-music-dancing-with-the-stars-219107/ ／ 同「Dancing in Shadows」https://pixabay.com/music/pop-foxtrot-music-dancing-in-shadows-219116/ ／ Incompetech Jazz系から探索 | Pixabay（AI生成疑いあり、権利は要確認） |
| Quickstep | 200–208 | Pixabay「Quickstep Music - Dancing All Night」Tech_Oasis 2:00 https://pixabay.com/music/upbeat-quickstep-music-dancing-all-night-219526/ ／ 同「Dance All Night 4.0」https://pixabay.com/music/drum-n-bass-quickstep-music-dance-all-night-40-219523/ ／ 「Quickstep Night (Beach House)」NverAvetyanMusic https://pixabay.com/music/upbeat-quickstep-night-beach-house-374469/ | Pixabay。「drum-n-bass」ジャンル表記なので実テンポ要確認 |
| Rumba | 100–108 | Pixabay「Southern Moon Rumba - Latin - Piano」JuliusH 1:51 https://pixabay.com/music/latin-southern-moon-rumba-latin-piano-500109/ ／ 「Piano Rumba」JuliusH https://pixabay.com/music/smooth-jazz-piano-rumba-3948/ ／ 「Dansez sur ma rumba」Jean-Paul-V https://pixabay.com/music/samba-latin-dansez-sur-ma-rumba-276498/ | Pixabay。アフリカ系Rumba(ルンバ・コンゴ)が混ざる点に注意 |
| Cha-cha-cha | 120–128 | Pixabay「Cha Cha Lounge - Smooth Cuban Latin Cha-Cha-Cha」JuliusH 1:54 https://pixabay.com/music/cha-cha-latin-cha-cha-lounge-smooth-cuban-latin-cha-cha-cha-7790/ ／ 「Simple cha cha cha」Retrofan https://pixabay.com/music/cha-cha-latin-simple-cha-cha-cha-291958/ ／ Incompetech「Future Cha Cha」 | Pixabay / CC BY 4.0 |
| Samba | 100–104 (2/4) | Pixabay「Samba Jazz Cocktail Bar」alex-morgan 2:19 https://pixabay.com/music/modern-jazz-samba-jazz-cocktail-bar-567546/ ／ 「samba latine」https://pixabay.com/music/samba-latin-samba-latine-337529/ ／ Incompetech「Samba Isobel」「Modern Jazz Samba」 | Pixabay / CC BY 4.0。サンバジャズ(ボサ系)は遅い可能性大 |
| Paso Doble | 120–124 (2/4) | Pixabay「Paso Doble Music - Dancing with Fire」Tech_Oasis 2:00 https://pixabay.com/music/folk-paso-doble-music-dancing-with-fire-220332/ ／ 同「Dance of Love」https://pixabay.com/music/folk-paso-doble-music-dance-of-love-220336/ ／ 同「Dancing at Midnight」https://pixabay.com/music/folk-paso-doble-music-dancing-at-midnight-220334/ | Pixabay（同一作者・AI生成疑い） |
| Jive | 168–176 | Pixabay「Jive and Jitter - Bop Mix」AiCanvas 3:36 https://pixabay.com/music/traditional-jazz-jive-and-jitter-bop-mix-441277/ ／ 「Jive Parade - 1940s Style Big Band」kaazoom https://pixabay.com/music/big-band-jive-parade-1940s-style-big-band-music-448088/ ／ Incompetech「Hot Swing」 | Pixabay / CC BY 4.0 |

Incompetechの個別曲URL・BPMは、トラックリスト（https://incompetech.com/music/royalty-free/full_list.php）に曲名とISRCのみ表示のため今回は特定していない（曲名の存在のみ **[確認]**、内容・テンポは **[未確認]**）。

---

## 4. リスク

1. **テンポが規定内に収まる曲は少ない**: 検索ヒット曲のBPMは全て不明で、タイトルがダンス名でも実テンポは別物の可能性が高い（特にQuickstep 200BPM超・Viennese Waltz 174–180 BPMは希少）。採用前にオーディオ解析で実測が必要。
2. **テンポの安定性**: クラシック生演奏（Musopen等のStrauss）はrubato・ritardandoでテンポが揺れ、カウントの重ね合わせに不向き。MIDI/打ち込み系やクリック同期済みの曲を優先するか、一定BPMに時間伸縮（品質劣化に注意）する。
3. **Pixabayのstandalone条項**: アプリ同梱（音声ファイルが取り出せる形）が「新しい創作物」とみなされるかは約款上グレー。ストア審査・権利者クレームに備え、Pixabayへ事前問い合わせ、またはCC BY 4.0（Incompetech）を主軸にする。
4. **AI生成曲の混在**: Tech_Oasis等の2分固定・連番曲はAI生成の可能性（**[未確認]**）。AI生成物の権利帰属・Content ID登録リスクがある。
5. **CC BYの帰属表示と改変表示**: アプリ内クレジット画面に「曲名・作者・出典URL・CC BY 4.0リンク・変更点（カウント音声を重ね、必要なら長さ/テンポ調整）」を記載。ストア説明欄にも記載すると安全。
6. **ND／NC／SAの排除**: FMAやccMixterはライセンスが混在。ND(改変不可)はカウント重ね合わせ不可、NCは商用不可（無料アプリでも法人公開は商用扱いとみなされうる）、SAは波及リスク。
7. **ライセンスの経時変化**: 規約は変更されうるため、採用時点のライセンスページを保存（スクリーンショット/PDF）し、曲ごとに台帳（URL・作者・ライセンス・取得日・測定BPM）を作る。
8. **Jamendo・Musopen・ccMixterは今回内容を確認できなかった**: ブラウザでの人手確認が必要。
9. **WDSFテンポ表の版**: 確認できたのは2012年版Professional Division規則。現行アマチュア規則での再確認は未実施。
10. **ダンス専用の同梱可ライブラリは見つからなかった**: 現実的な選択肢は「CC BY（Incompetech）＋Pixabayの慎重な選定」または「自作/発注（作曲家にCC0または買い切り契約で依頼）」。数が少ない場合は自作・発注が結局もっとも安全で、テンポ精度も確保できる。

---

## 5. 次の一手（提案）
- 各候補をローカルにダウンロードしてBPMを実測（librosa/aubio等）→ レンジ内に入る曲だけ残す。
- Pixabayのstandalone条項を問い合わせ、回答を保存。
- テンポが合う曲が足りないダンスは、一定BPMのバッキングトラックを自作または作曲家へ発注するか判断。
