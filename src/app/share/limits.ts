// 配布ファイルの形と上限（仕様 §7「配布ファイル」・Ruling 80・D36）。
export const BUNDLE_TYPE = 'dance-count-bundle';
export const BUNDLE_SCHEMA_VERSION = 1;
export const BUNDLE_MAX_BYTES = 20 * 1024 * 1024;    // file.size で読む前に拒む（§7）
export const BUNDLE_ROUTINES_MAX = 50;               // 1 ファイルのルーティン（端末の 200 とは別）
export const DISTRIBUTOR_NAME_MAX = 40;              // 配る人の名前
// 拡張子は .dancecount.txt・MIME は text/plain（Chrome・Android は .json を share() で拒む。F19・F20・D36）。中身は JSON。
export const BUNDLE_EXTENSION = '.dancecount.txt';
export const BUNDLE_MIME = 'text/plain';
// S10 の <input type=file accept>。旧画面の単体パック（.json）も選べるように残す（Ruling 80-3）。
export const BUNDLE_ACCEPT = '.txt,.json,text/plain,application/json';
