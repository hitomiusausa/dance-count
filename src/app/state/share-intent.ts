// S7（録音の声の「配る」）・S8 完成の「配る」・S3（ルーティンの「配る」）から S9 へ渡す一回限りの印（Ruling 82-1）。
// URL・保存には書かない（再読み込み・直接開いた時は何も選ばれていない）。S9 はマウント時に 1 回だけ受け取る。
export interface ShareIntent { voiceId?: string; routineId?: string }

let pending: ShareIntent | null = null;

export function requestShareIntent(intent: ShareIntent): void {
  pending = { ...intent };
}

export function takeShareIntent(): ShareIntent | null {
  const value = pending;
  pending = null;
  return value;
}
