// S9 配るの並びと帯の 1 行（段5 Task 10b・使いやすさの通し確認の Open question 2・4）。画面に依らない純粋な判断。
import type { ShareIntent } from '../state/share-intent.ts';

export type ShareSection = 'voice' | 'routines';

// 名前はいつも先頭。声の指定（S7 の「配る」・S8 完成の「配る ›」）で来た時は 声 → ルーティン（今のまま）。
// 声の指定が無い時（S6「ルーティンを配る」・S3 の行の「配る」・直接開いた時）は ルーティン → 声
// （ルーティンを配りに来た人に、最初に声の 2 択を見せない。375×548 でルーティンの行が帯の下に隠れない）。
export function shareSectionOrder(intent: ShareIntent | null): ShareSection[] {
  return intent?.voiceId ? ['voice', 'routines'] : ['routines', 'voice'];
}

// 帯の「声かルーティンを選ぶと、ファイルを作れます。」は、選べる物がある時だけ出す。
// 録音した声もルーティンも無い時は、上の「…まだありません。」の 2 行で足りる（選べる物が無いのに「選ぶと」と言わない）。
export function showChooseNote(input: { needsSomething: boolean; voiceCount: number; routineCount: number }): boolean {
  return input.needsSomething && (input.voiceCount > 0 || input.routineCount > 0);
}
