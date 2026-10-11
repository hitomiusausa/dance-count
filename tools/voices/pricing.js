// 費用見積もりの定数（Ruling 65-2・F13）。**未確認**: 価格ページは JS 描画で取得できず、一般知識の値。
// ひとみうさが Google Cloud の課金画面の価格表で確かめてから生成する（Ruling 69-1）。
export const PRICING_SOURCE_URL = 'https://cloud.google.com/text-to-speech/pricing';
export const PRICING_VERIFIED = false;
export const USD_TO_JPY_HINT = 160;   // 目安（表示用）。為替は確かめていない

export const PRICING = Object.freeze({
  google: Object.freeze({
    standard: Object.freeze({ usdPerMillion: 4, freeCharsPerMonth: 4_000_000 }),
    wavenet: Object.freeze({ usdPerMillion: 16, freeCharsPerMonth: 1_000_000 }),
    neural2: Object.freeze({ usdPerMillion: 16, freeCharsPerMonth: 1_000_000 }),
    'chirp3-hd': Object.freeze({ usdPerMillion: 30, freeCharsPerMonth: 1_000_000 })
  })
});

export function googleTier(voiceName) {
  const name = String(voiceName);
  if (/Chirp3?-HD/i.test(name)) return 'chirp3-hd';
  if (/Neural2/i.test(name)) return 'neural2';
  if (/Wavenet/i.test(name)) return 'wavenet';
  if (/Standard/i.test(name)) return 'standard';
  return 'neural2';   // 分からない声は高い方（保守的）で数える
}

// chars は SSML タグも含めた文字数（保守的な数え方）
export function estimateCost(provider, voiceName, chars) {
  if (provider !== 'google') return { provider, tier: 'free', chars, paidUsd: 0, freeTierUsd: 0, verified: true };
  const tier = googleTier(voiceName);
  const price = PRICING.google[tier];
  return {
    provider,
    tier,
    chars,
    freeTierUsd: 0,
    paidUsd: chars * price.usdPerMillion / 1_000_000,
    usdPerMillion: price.usdPerMillion,
    freeCharsPerMonth: price.freeCharsPerMonth,
    verified: PRICING_VERIFIED,
    source: PRICING_SOURCE_URL
  };
}

export function formatCostLines(estimate) {
  if (estimate.provider !== 'google') return ['費用: ¥0（外部の有料サービスを使いません）'];
  const usd = estimate.paidUsd;
  const usdText = usd < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`;
  return [
    `費用見積もり（${estimate.chars} 文字・${estimate.tier}・$${estimate.usdPerMillion}/100万文字）:`,
    `  無料枠内なら ¥0（月 ${estimate.freeCharsPerMonth.toLocaleString('en-US')} 文字まで）`,
    `  枠外なら ${usdText}（約 ¥${Math.ceil(usd * USD_TO_JPY_HINT)}）`,
    `  ※価格は未確認です。課金画面の価格表で確かめてください: ${estimate.source}`
  ];
}
