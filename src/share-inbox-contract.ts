// Android の共有（share_target）の受け口の契約（Ruling 79-2・93-3）。正本はここ 1 つ。
// 画面（src/app/platform/files.ts の takeInboxFile）と Service Worker（src/sw.ts）、manifest（vite.config.ts）が同じ値を import する。
// SW は src/app の外の別ビルドなので、platform/files.ts から import しない（src/ 直下に置く）。
export const INBOX_CACHE = 'dance-count-inbox';
// 相対の鍵: SW は dist 直下（./sw.js）・index.html も直下なので、SW の put とページの match は同じ URL に解ける（Ruling 93-4）。
export const INBOX_KEY = './inbox/bundle';
// ファイル名は encodeURIComponent してこのヘッダーに（段5 答え 8）。
export const INBOX_FILE_HEADER = 'X-File-Name';
// manifest の share_target.params.files[0].name と、SW が formData から読む欄の名前。
export const SHARE_TARGET_FIELD = 'bundle';
