// S8「録音する」の合図（D59・ひとみうさの決定 2026-10-14）: 3 → 2 → 1 → 「今！」を約 1 秒ごと。3・2・1 で短い「ピ」、今で「ポーン」。
// 録音（MediaRecorder.start）は「ポーン」が鳴り終わってから＋余白（出力の遅れ・マイクの入力の遅れ・部屋の響き）で始める＝合図の音は録音に入らない。
// 練習の拍（tempo-map）とは別物（録音の合図は 1 つの語の前の 1 回だけで、拍の時刻を作らない）。時刻の正はこの表 1 つ。
export const COUNTDOWN = Object.freeze({
  stepMs: 1000,      // 3 → 2 → 1 → 今 の間隔
  leadMs: 60,        // 最初の「ピ」を鳴らすまで（AudioContext の予約の余裕）
  piMs: 70,          // 3・2・1 の「ピ」
  piHz: 880,
  ponMs: 110,        // 今の「ポーン」（ピより高く・長く。120ms 以下＝ひとみうさの決定）
  ponHz: 1320,
  guardMs: 150       // ポーンの終わりから録音の開始までの余白（入力の遅れ＋響き）。出力の遅れ（Bluetooth など）はこれに足す
});

export type CountMark = 3 | 2 | 1 | 'now';
export interface CountdownCue { atMs: number; hz: number; ms: number }
export interface CountdownPlan { cues: CountdownCue[]; marks: { atMs: number; mark: CountMark }[]; cuesEndMs: number; captureAtMs: number }

// 合図の表（純粋）。atMs は合図を始めた時から。outputLatencyMs は「鳴らした音が耳（とマイク）に届くまで」。
// 画面の数字は聞こえる時に合わせて遅らせ、録音の開始は「最後の音が届き終わった時＋余白」。
export function countdownPlan(outputLatencyMs = 0): CountdownPlan {
  const { stepMs, leadMs, piMs, piHz, ponMs, ponHz, guardMs } = COUNTDOWN;
  const latency = Math.max(0, outputLatencyMs);
  const cues: CountdownCue[] = [0, 1, 2].map(index => ({ atMs: leadMs + index * stepMs, hz: piHz, ms: piMs }));
  cues.push({ atMs: leadMs + 3 * stepMs, hz: ponHz, ms: ponMs });
  const marks = ([3, 2, 1, 'now'] as const).map((mark, index) => ({ atMs: leadMs + index * stepMs + latency, mark }));
  const cuesEndMs = Math.max(...cues.map(cue => cue.atMs + cue.ms));
  return { cues, marks, cuesEndMs, captureAtMs: cuesEndMs + latency + guardMs };
}

// 録音を始めてよい時の、もう一度の確かめ（純粋）。画面の時計（setTimeout）と音の時計（AudioContext.currentTime）はずれうる
// （iOS で AudioContext の resume が遅れた・時計が止まっていた）。音の時計でまだ合図が鳴り終わっていなければ、
// 呼び出し側は残りの合図を止め（stop）、止めた音が届き終わるまで（出力の遅れ＋余白）待つ。返すのはその待ち時間（0 なら今すぐ）。
export function captureWaitMs(plan: CountdownPlan, audioElapsedMs: number | null, outputLatencyMs = 0): number {
  if (audioElapsedMs === null) return 0;   // 合図の音を鳴らしていない（音が使えない）＝待つ理由が無い
  if (audioElapsedMs >= plan.cuesEndMs) return 0;
  return Math.max(0, outputLatencyMs) + COUNTDOWN.guardMs;
}

// 合図と録音のあいだ、マイクが開いている時間の目安（S13 のプライバシーの文「約 6 秒」の根拠。test が文と突き合わせる）。
// マイクを開くまで（〜0.5 秒）＋合図＋録音の窓。
export function micOpenEstimateMs(takeMs: number, openMs = 500, outputLatencyMs = 0): number {
  return openMs + countdownPlan(outputLatencyMs).captureAtMs + takeMs;
}
