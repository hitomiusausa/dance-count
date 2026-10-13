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

// 夜間便 B-3（Ruling 124・監査 #5）: 開いた時に選んでおく物。同意（D37・D39・Ruling 82）は既定にしない＝声を選んでおいても「ファイルを作る」は同意を押すまで押せない。
// ルーティン: 指定（S3 の行の「配る」）があればそれ／無ければ配れるルーティンがちょうど 1 本ならそれ／それ以外は何も選ばない。
// 声: 指定（S7・S8 の「配る」）があり、それが配れる声ならそれ／無ければ完成した自分の録音がちょうど 1 つならそれ／それ以外は「入れない」。
// recordedIds は完成した自分の録音だけ（受け取った声は配れない＝既定にもならない。D37）。
export function shareDefaults(input: { intent: ShareIntent | null; recordedIds: readonly string[]; routineIds: readonly string[] }): { voiceId: string | null; routineIds: string[] } {
  const { intent, recordedIds, routineIds } = input;
  const routine = intent?.routineId ?? (routineIds.length === 1 ? routineIds[0]! : null);
  const voiceId = intent?.voiceId && recordedIds.includes(intent.voiceId) ? intent.voiceId
    : !intent?.voiceId && recordedIds.length === 1 ? recordedIds[0]!
    : null;
  return { voiceId, routineIds: routine ? [routine] : [] };
}
