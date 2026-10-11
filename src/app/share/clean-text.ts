// 受け取った文字（ファイル名・配る人の名前・声やルーティン・フィガーの名前）から、見えない制御文字と
// 文字の向きを変える見えない文字（U+202E など）を除く。表示が逆向きに化けたり、見えない文字で別の名前に見えたりしないように
// （段5 Tasks 1–3・4–5 レビュー）。純粋。
export const BIDI_CONTROLS = /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;
export const CONTROLS = /[\u0000-\u001f\u007f-\u009f]/g;

export function stripInvisible(text: string): string {
  return text.replace(BIDI_CONTROLS, '').replace(CONTROLS, '');
}
