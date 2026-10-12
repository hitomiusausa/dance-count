// Android の共有（share_target）の受け口の契約（Ruling 79-2・93-3）。正本はここ 1 つ。
// 画面（src/app/platform/files.ts の takeInboxFile）と Service Worker（src/sw.ts）、manifest（vite.config.ts）が同じ値を import する。
// SW は src/app の外の別ビルドなので、platform/files.ts から import しない（src/ 直下に置く）。
// 配布ファイルの大きさの上限（仕様 §7）。正本はここ（SW が src/app を読まないように。src/app/share/limits.ts はこれを再び export する）。
export const BUNDLE_MAX_BYTES = 20 * 1024 * 1024;

export const INBOX_CACHE = 'dance-count-inbox';
// 相対の鍵: SW は dist 直下（./sw.js）・index.html も直下なので、SW の put とページの match は同じ URL に解ける（Ruling 93-4）。
export const INBOX_KEY = './inbox/bundle';
// ファイル名は encodeURIComponent してこのヘッダーに（段5 答え 8）。
export const INBOX_FILE_HEADER = 'X-File-Name';
// manifest の share_target.params.files[0].name と、SW が formData から読む欄の名前。
export const SHARE_TARGET_FIELD = 'bundle';
// 大きすぎる（BUNDLE_MAX_BYTES を超える）ファイルは受け口に書かず、本文の無い印だけを置く（段7 レビュー M1）。
// S10 はこの印を見て、ファイルを選んだ時と同じ「大きすぎ」の枠を出す（共有したのに何も起きない、にしない）。
export const INBOX_TOO_LARGE_HEADER = 'X-Too-Large';

// SW が受け口に put する Response（純粋。Node でテストする）。名前は encodeURIComponent してヘッダーに。
export function inboxResponseFor(file: File): Response {
  if (file.size > BUNDLE_MAX_BYTES) return new Response(null, { headers: { [INBOX_TOO_LARGE_HEADER]: '1' } });
  return new Response(file, { headers: { 'Content-Type': file.type || 'text/plain', [INBOX_FILE_HEADER]: encodeURIComponent(file.name) } });
}
