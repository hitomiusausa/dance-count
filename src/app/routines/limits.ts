// ルーティンの上限（Ruling 37）。超えたら入力を止める（maxLength・ボタンの無効。文言は出さない）。
export const ROUTINE_NAME_MAX = 40;
export const FIGURE_NAME_MAX = 40;
export const COUNTS_MAX = 32;
export const FIGURES_MAX = 64;
export const ROUTINES_MAX = 200;
// 作ったアプリの版の文字列（受け取ったファイルから来る。長すぎる物はここで切る。段5 Tasks 1–3 レビュー）
export const CREATED_WITH_VERSION_MAX = 40;
