// S9 配るの並びと帯の 1 行（段5 Task 10b・使いやすさの通し確認の Open question 2・4）。画面に依らない純粋な判断。
import type { ShareIntent } from '../state/share-intent.ts';

export type ShareSection = 'voice' | 'routines';

// 名前はいつも先頭。声の指定（S7 の「配る」・S8 完成の「配る ›」）で来た時は 声 → ルーティン（今のまま）。
// 声の指定が無い時（S6「ルーティンを配る」・S3 の行の「配る」・直接開いた時）は ルーティン → 声
// （ルーティンを配りに来た人に、最初に声の 2 択を見せない。375×548 でルーティンの行が帯の下に隠れない）。
export function shareSectionOrder(intent: ShareIntent | null): ShareSection[] {
  return intent?.voiceId ? ['voice', 'routines'] : ['routines', 'voice'];
}

// 帯の 1 行（主ボタン「ファイルを作る」が押せない理由）。
// 'choose'＝「声かルーティンを選ぶと、ファイルを作れます。」: 選べる物がある時だけ（選べる物が無いのに「選ぶと」と言わない）。
// 'nothing'＝D51（final-review m2・代理決定）「先に声を録音するか、ルーティンを作ると配れます。」: 録音した声もルーティンも無い時（行き止まりにしない。操作は増やさない）。
export type ShareDockNote = 'choose' | 'nothing' | null;
export function shareDockNote(input: { needsSomething: boolean; voiceCount: number; routineCount: number }): ShareDockNote {
  if (input.voiceCount === 0 && input.routineCount === 0) return 'nothing';
  return input.needsSomething ? 'choose' : null;
}
