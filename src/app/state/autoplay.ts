// 「前回」カード（S1）と S3 の「▶ 再生」から再生画面へ渡す一回限りの印（Ruling 32・40）。URL・保存には書かない
// （再読み込み・ブラウザの戻る・直接開いた時に勝手に鳴らないように）。種目とルーティンの両方に使う。
export interface AutoplayMark { kind: 'dance' | 'routine'; id: string }

let pending: AutoplayMark | null = null;

export function requestAutoplay(mark: AutoplayMark): void {
  pending = { kind: mark.kind, id: mark.id };
}

// 再生画面のマウント時に1回だけ呼ぶ。種類と ID の両方が一致した時だけ true。一致してもしなくても印は消える。
export function takeAutoplay(mark: AutoplayMark): boolean {
  const matched = pending !== null && pending.kind === mark.kind && pending.id === mark.id;
  pending = null;
  return matched;
}
