export const TICKS_PER_BEAT = 960;

export const DANCE_PROFILES = Object.freeze({
  waltz: profile('waltz', 'ワルツ', 3, 84, [84, 90], ['123', '12&3'], '123&@'),
  tango: profile('tango', 'タンゴ', 4, 112, [124, 136], ['SSQQS'], 'SQ&@'),
  vwaltz: profile('vwaltz', 'ヴィエニーズワルツ', 3, 150, [168, 180], ['123'], '123&@'),
  slowfox: profile('slowfox', 'スローフォックス', 4, 80, [112, 120], ['SQQ'], 'SQ&@'),
  quickstep: profile('quickstep', 'クイックステップ', 4, 160, [192, 208], ['SQQ', 'QQS'], 'SQ&@'),
  rumba: profile('rumba', 'ルンバ', 4, 80, [100, 108], ['2341'], '1234&@'),
  chacha: profile('chacha', 'チャチャチャ', 4, 96, [112, 128], ['234&1'], '1234&a@'),
  samba: profile('samba', 'サンバ', 2, 80, [100, 104], ['1a2', 'SQQ'], '12SQ&a@', { sambaSQ: true }),
  pasodoble: profile('pasodoble', 'パソドブレ', 4, 96, [112, 124], ['1234', '12345678'], '12345678&@'),
  jive: profile('jive', 'ジャイブ', 4, 136, [168, 176], ['123a45a6'], '123456a@')
});

function profile(id, name, beatsPerBar, practiceBpm, competitionBpm, templates, allowedTokens, extra = {}) {
  return Object.freeze({
    id,
    name,
    beatsPerBar,
    beatUnit: 4,
    practiceBpm,
    competitionBpm: Object.freeze({ min: competitionBpm[0], max: competitionBpm[1] }),
    templates: Object.freeze(templates),
    allowedTokens: Object.freeze([...allowedTokens]),
    ...extra
  });
}

export function getDanceProfile(id) {
  const profile = DANCE_PROFILES[id];
  if (!profile) throw new Error(`Unknown dance profile: ${id}`);
  return profile;
}
