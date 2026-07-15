const MODERN_SOURCE = 'https://www.istd.org/documents/modern-ballroom-professional-modular-examinations-syllabus/';
const LATIN_SOURCE = 'https://www.istd.org/documents/latin-american-syllabus-outline/latin-american-syllabus-september-24.pdf';

const definitions = [
  modern('waltz', 'Closed Changes', ['クローズドチェンジ', 'クローズド・チェンジ']),
  modern('waltz', 'Natural Turn', ['ナチュラルターン']),
  modern('waltz', 'Reverse Turn', ['リバースターン']),
  modern('waltz', 'Whisk', ['ウィスク']),
  modern('waltz', 'Chasse from PP', ['シャッセ フロム PP', 'シャッセフロムPP']),
  modern('waltz', 'Hesitation Change', ['ヘジテーションチェンジ', 'ヘジテーション・チェンジ']),
  modern('waltz', 'Outside Change', ['アウトサイドチェンジ', 'アウトサイド・チェンジ']),
  modern('waltz', 'Reverse Corte', ['リバース・コルテ']),
  modern('waltz', 'Back Whisk', ['バックウィスク', 'バック・ホイスク']),
  modern('waltz', 'Double Reverse Spin', ['ダブルリバーススピン']),
  modern('waltz', 'Back Lock', ['バックロック']),
  modern('waltz', 'Progressive Chasse to Right', ['プログレッシブ・シャッセ・トゥ・ライト', 'シャッセ トゥ ライト']),
  modern('waltz', 'Weave from PP', ['ウィーブ フロム PP', 'ウィーブ・フロム・PP']),
  modern('waltz', 'Closed Telemark', ['クローズド・テレマーク']),
  modern('waltz', 'Open Impetus', ['オープン・インピタス・ターン']),

  modern('slowfox', 'Feather Step', ['フェザーステップ']),
  modern('slowfox', 'Three Step', ['スリーステップ']),
  modern('slowfox', 'Natural Turn', ['ナチュラルターン']),
  modern('slowfox', 'Reverse Turn', ['リバースターン']),
  modern('slowfox', 'Closed Telemark', ['クローズドテレマーク']),
  modern('slowfox', 'Open Telemark and Feather Ending', ['オープンテレマーク アンド フェザーエンディング']),
  modern('slowfox', 'Hover Telemark', ['ホーバーテレマーク', 'ホバーテレマーク']),
  modern('slowfox', 'Hover Cross', ['ホーバークロス']),
  modern('slowfox', 'Open Impetus', ['オープンインピタス']),

  modern('quickstep', 'Quarter Turn to Right', ['クォーターターン']),
  modern('quickstep', 'Natural Spin Turn', ['ナチュラルスピンターン']),
  modern('quickstep', 'Progressive Chasse', ['プログレッシブシャッセ']),
  modern('quickstep', 'Forward Lock', ['フォワードロック']),
  modern('quickstep', 'Back Lock', ['バックロック']),

  modern('tango', 'Progressive Link', ['プログレッシブリンク']),
  modern('tango', 'Closed Promenade', ['クローズドプロムナード', 'クローズド・プロムナード']),
  modern('tango', 'Back Corte', ['バックコルテ']),
  modern('tango', 'Open Promenade', ['オープンプロムナード']),
  modern('tango', 'Natural Twist Turn', ['ナチュラルツイストターン']),
  modern('tango', 'Natural Promenade Turn', ['ナチュラルプロムナードターン']),
  modern('tango', 'Promenade Link', ['プロムナードリンク']),
  modern('tango', 'Four Step', ['フォーステップ']),
  modern('tango', 'Back Open Promenade', ['バックオープンプロムナード']),
  modern('tango', 'Outside Swivels', ['アウトサイドスウィブル', 'アウトサイドスイブル']),
  modern('tango', 'Fallaway Promenade', ['フォーラウェイプロムナード']),
  modern('tango', 'Brush Tap', ['ブラッシュタップ']),

  latin('rumba', 'Cuban Rocks', ['キューバンロックス']),
  latin('rumba', 'New York', ['ニューヨーク']),
  latin('rumba', 'Fan', ['ファン']),
  latin('rumba', 'Alemana', ['アレマーナ']),
  latin('rumba', 'Hockey Stick', ['ホッキースティック']),
  latin('rumba', 'Natural Top', ['ナチュラルトップ']),
  latin('rumba', 'Opening Out to Right and Left', ['オープニングアウトtoライトアンドレフト']),
  latin('rumba', 'Open Hip Twist', ['オープンヒップツイスト']),
  latin('rumba', 'Rope Spinning', ['ロープスピニング']),

  latin('chacha', 'New York', ['ニューヨーク']),
  latin('chacha', 'Spot Turns', ['スポットターン', 'スポットターン トゥ レフト', 'スポットターンtoレフト']),
  latin('chacha', 'Three Cha Cha Chas', ['スリー チャ チャ チャ（バック）', 'スリー チャ チャ チャ（フォワード）']),
  latin('chacha', 'Time Steps', ['タイムステップ LF', 'タイムステップ RF']),
  latin('chacha', 'Fan', ['ファン']),
  latin('chacha', 'Alemana', ['アレマーナ']),
  latin('chacha', 'Hockey Stick', ['ホッキースティック']),
  latin('chacha', 'Closed Hip Twist', ['クローズドヒップツイスト']),
  latin('chacha', 'Open Hip Twist', ['オープンヒップツイスト']),
  latin('chacha', 'Split Cuban Breaks', ['スプリットキューバンブレイク（RアンドL）']),
  latin('chacha', 'Chase', ['チェイス']),
  latin('chacha', 'Hip Twist Spiral', ['ヒップツイストスパイラル']),

  latin('samba', 'Whisks', ['ウィスク']),
  latin('samba', 'Samba Walks', ['サンバウォーク']),
  latin('samba', 'Foot Changes', ['フットチェンジ（方法1）', 'フットチェンジ（方法2）']),
  latin('samba', 'Reverse Turn', ['リバースターン']),
  latin('samba', 'Corta Jaca', ['コルタジャカ']),
  latin('samba', 'Open Rocks', ['オープンロックス']),
  latin('samba', 'Samba Locks', ['サンバロックス']),
  latin('samba', 'Cruzados Walks and Locks', ['クルザードスウォークス アンド ロックス']),

  latin('pasodoble', 'Sur Place', ['シュールプラス']),
  latin('pasodoble', 'Chasses to Right', ['シャッセ トゥ ライト', 'シャッセツーライト', 'シャッセ トゥ ライト（ウィズエレベーション）']),
  latin('pasodoble', 'Deplacement (Attack)', ['アタック']),
  latin('pasodoble', 'Promenade Close', ['プロムナードクローズ']),
  latin('pasodoble', 'Promenade', ['プロムナード']),
  latin('pasodoble', 'Ecart (Fallaway Whisk)', ['エカルト']),
  latin('pasodoble', 'Sixteen', ['シックスティーン']),
  latin('pasodoble', 'Promenade and Counter Promenade', ['プロムナード & カウンタープロムナード']),
  latin('pasodoble', 'Grand Circle', ['グランドサークル']),
  latin('pasodoble', 'Twist Turn', ['ツイストターン']),

  latin('jive', 'Basic in Place', ['ベーシックインプレイス']),
  latin('jive', 'Fallaway Throwaway', ['スロウアウェイフォーラウェイ']),
  latin('jive', 'Link', ['リンク']),
  latin('jive', 'Change of Places Right to Left', ['チェンジオブプレイス (RtoL)']),
  latin('jive', 'Change of Places Left to Right', ['チェンジオブプレイス (LtoR)']),
  latin('jive', 'American Spin', ['アメリカンスピン'])
];

export const FIGURE_TERMINOLOGY = Object.freeze(buildRegistry(definitions));

export function figureDisplayName(danceId, sourceName, uiLocale = 'ja-JP') {
  if (!uiLocale.startsWith('en')) return sourceName;
  return FIGURE_TERMINOLOGY[terminologyKey(danceId, sourceName)]?.englishName ?? sourceName;
}

export function figureTerminologyEvidence(danceId, sourceName) {
  return FIGURE_TERMINOLOGY[terminologyKey(danceId, sourceName)] ?? null;
}

export function terminologyCoverage(routines) {
  let figures = 0;
  let verified = 0;
  const unique = new Set();
  const verifiedUnique = new Set();
  for (const routine of routines) {
    for (const figure of routine.figures ?? []) {
      figures += 1;
      const key = terminologyKey(routine.danceId, figure.name);
      unique.add(key);
      if (FIGURE_TERMINOLOGY[key]) {
        verified += 1;
        verifiedUnique.add(key);
      }
    }
  }
  return { figures, verified, unverified: figures - verified, unique: unique.size, verifiedUnique: verifiedUnique.size };
}

function buildRegistry(items) {
  const registry = {};
  for (const item of items) {
    for (const alias of item.sourceAliases) {
      const key = terminologyKey(item.danceId, alias);
      if (registry[key]) throw new Error(`Duplicate figure terminology alias: ${item.danceId} / ${alias}`);
      registry[key] = Object.freeze({ ...item, sourceName: alias });
    }
  }
  return registry;
}

function modern(danceId, englishName, sourceAliases) {
  return entry(danceId, englishName, sourceAliases, MODERN_SOURCE, 'ISTD Modern Ballroom Professional Modular Examinations Syllabus 2018');
}

function latin(danceId, englishName, sourceAliases) {
  return entry(danceId, englishName, sourceAliases, LATIN_SOURCE, 'ISTD Latin American Syllabus Outline September 2024');
}

function entry(danceId, englishName, sourceAliases, sourceReference, sourceTitle) {
  return Object.freeze({ danceId, englishName, sourceAliases: Object.freeze(sourceAliases), terminologyAuthority: 'ISTD', claimStatus: 'verified', sourceReference, sourceTitle });
}

function terminologyKey(danceId, sourceName) {
  return `${danceId}\u0000${sourceName}`;
}
