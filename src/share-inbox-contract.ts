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

// 共有の POST の本文（multipart）の、ファイルの外の分（区切り・欄の名前・ファイル名・種類）の余裕。これを足しても超える長さは、
// 中のファイルが必ず BUNDLE_MAX_BYTES を超える（ファイル名が長くても数 KB。余裕を大きめに取り、ちょうど 20MB のファイルを誤って拒まない）。
export const SHARE_POST_OVERHEAD_BYTES = 64 * 1024;

// 本文を読む前の早めの判定（段7 最終レビュー m3）: Content-Length があり、余裕を足した上限を超えていれば true。
// 無い・読めない時は false（読んだ後の file.size の判定に任せる）。純粋（Node でテストする）。
export function shareTooLargeByLength(contentLength: string | null): boolean {
  if (contentLength === null || !/^\d+$/.test(contentLength.trim())) return false;
  return Number(contentLength.trim()) > SHARE_POST_MAX_BYTES;
}

// 本文を上限までだけ読む（段7 最終レビュー m3 の続き）。Chrome は SW の request に Content-Length を見せない（fetch・フォームの POST
// とも。実測 2026-10-12・Chrome 154）ので、上の判定はほぼ働かない。代わりに本文を少しずつ数え、上限を超えた所で読むのをやめる
//（取り消す）＝SW のメモリに溜まるのは上限＋1 かたまりまで。超えたら null、収まれば読んだ全部。純粋（Node でテストする）。
export async function readBodyWithin(body: ReadableStream<Uint8Array>, limit: number): Promise<Uint8Array<ArrayBuffer> | null> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.byteLength; }
  return all;
}

// 共有の POST の本文の上限（ファイルの上限＋multipart の余裕）。
export const SHARE_POST_MAX_BYTES = BUNDLE_MAX_BYTES + SHARE_POST_OVERHEAD_BYTES;

// 大きすぎの印（本文の無い Response）。
export function tooLargeMarker(): Response {
  return new Response(null, { headers: { [INBOX_TOO_LARGE_HEADER]: '1' } });
}

// SW が受け口に put する Response（純粋。Node でテストする）。名前は encodeURIComponent してヘッダーに。
export function inboxResponseFor(file: File): Response {
  if (file.size > BUNDLE_MAX_BYTES) return tooLargeMarker();
  return new Response(file, { headers: { 'Content-Type': file.type || 'text/plain', [INBOX_FILE_HEADER]: encodeURIComponent(file.name) } });
}
