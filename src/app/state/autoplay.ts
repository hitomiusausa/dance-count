// 「前回」カードから S2 へ渡す一回限りの印（Ruling 32）。URL・保存には書かない
// （再読み込み・ブラウザの戻る・直接開いた時に勝手に鳴らないように）。
let pendingDanceId: string | null = null;

export function requestAutoplay(danceId: string): void {
  pendingDanceId = danceId;
}

// S2 のマウント時に1回だけ呼ぶ。一致してもしなくても印は消える。
export function takeAutoplay(danceId: string): boolean {
  const matched = pendingDanceId === danceId;
  pendingDanceId = null;
  return matched;
}
