// 配る人の見分け用の番号（D76（ひとみうさ承認 2026-10-15））。先生の端末ごとに 1 つ、初めて配布ファイルを作る時にでたらめに作って設定に残す。
// 端末の情報からは作らない・画面には出さない。端末のデータを消すと次に作り直す（それでよい）。
// 束では distributor.id、受け取った声では distributor.id、受け取ったルーティンでは receivedFrom.distributorId。
export const DISTRIBUTOR_ID_BYTES = 16;                       // 128 ビット（ぶつからない長さ）
export const DISTRIBUTOR_ID_PATTERN = /^[0-9a-f]{32}$/;       // 16 バイトの 16 進・小文字

export type RandomSource = Pick<Crypto, 'getRandomValues'>;

export function newDistributorId(random: RandomSource = crypto): string {
  const bytes = random.getRandomValues(new Uint8Array(DISTRIBUTOR_ID_BYTES));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

// ファイル・端末から読んだ値。形が外れていれば null（ファイルは壊れていない扱い＝番号なしの束として読む）
export function readDistributorId(value: unknown): string | null {
  return typeof value === 'string' && DISTRIBUTOR_ID_PATTERN.test(value) ? value : null;
}

// 配る時の番号: 設定にあればそれ、無ければ作る（isNew の時だけ呼び出し側が設定に残す）
export function ensureDistributorId(saved: string | null, make: () => string = newDistributorId): { id: string; isNew: boolean } {
  const current = readDistributorId(saved);
  return current ? { id: current, isNew: false } : { id: make(), isNew: true };
}
