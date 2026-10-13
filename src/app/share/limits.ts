// 配布ファイルの形と上限（仕様 §7「配布ファイル」・Ruling 80・D36）。
export const BUNDLE_TYPE = 'dance-count-bundle';
export const BUNDLE_SCHEMA_VERSION = 1;
// file.size で読む前に拒む（§7）。値の正本は受け口の契約（SW も同じ値を使う。SW は src/app を読まない）
export { BUNDLE_MAX_BYTES } from '../../share-inbox-contract.ts';
export const BUNDLE_ROUTINES_MAX = 50;               // 1 ファイルのルーティン（端末の 200 とは別）
export const DISTRIBUTOR_NAME_MAX = 40;              // 配る人の名前
// 拡張子は .dancecount.txt・MIME は text/plain（Chrome・Android は .json を share() で拒む。F19・F20・D36）。中身は JSON。
export const BUNDLE_EXTENSION = '.dancecount.txt';
export const BUNDLE_MIME = 'text/plain';
// S10 の <input type=file accept>。旧画面の単体パック（.json）も選べるように残す（Ruling 80-3）。
export const BUNDLE_ACCEPT = '.txt,.json,text/plain,application/json';

// 受け取った声の語の値（段5 最終レビュー I1）。ファイルの値は信用しない: 音量（gainDb）は捨てて 0（アプリは 0 しか書かない）、
// 形（mimeType）は録音・旧画面が作る音声の形だけ、時間（ms）は 0〜この値の外なら「読めない」。
// 今の録音は開始 ≤80ms・長さ ≤745ms・録音の中の開始 ≤1500ms（LATE_ONSET_MS。D59 で 1000 → 1500）。旧画面の未整形の録音も入るよう余裕を持たせる。
export const RECEIVED_WORD_MS_MAX = 10_000;
// 語ごとのずれ（wordOffsetsMs）はこの幅に収める（旧画面の補正 ±300ms が最大。エンジンの検査 ±1000ms より狭い）。
export const RECEIVED_WORD_OFFSET_MAX_MS = 300;
// 形の文字列の長さの上限と、受け付ける形（小文字・空白を除いて比べる）。WAV（整形済み）・webm/mp4/ogg（MediaRecorder。recorder.ts の MIME_TYPES）。
export const RECEIVED_MIME_MAX = 64;
export const RECEIVED_MIME_PATTERN = /^audio\/(wav|x-wav|wave|webm|mp4|ogg)(;codecs="?[a-z0-9.\-]+"?)?$/;
// 時刻の文字列（consentedAt・sourceUpdatedAt）の長さの上限。画面には出さない（CREATED_WITH_VERSION_MAX と同じ 40）。
export const RECEIVED_TIMESTAMP_MAX = 40;
