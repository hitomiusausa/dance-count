import { INBOX_CACHE, INBOX_FILE_HEADER, INBOX_KEY, INBOX_TOO_LARGE_HEADER, inboxResponseFor } from '../../share-inbox-contract.ts';
import { RECEIVED_FILE_FALLBACK, cleanReceivedFileName } from '../share/filename.ts';
import { BUNDLE_MAX_BYTES } from '../share/limits.ts';

// 配る（共有・保存）と受け取る（ファイルを読む・Android の受け口）の端末の面（Ruling 79-2・81）。
// navigator.share・<a download>・clipboard・Cache API はここだけ。ファイルを選ぶ <input type=file> は S10 の DOM が持つ。
export type ShareOutcome = 'shared' | 'cancelled' | 'refused';

export class BundleTooLargeError extends Error {
  constructor() {
    super('bundle file is too large');
    this.name = 'BundleTooLargeError';
  }
}

// canShare は種類を見ない（F20: Chrome は .json でも true を返し、share() で拒む）。拒否は shareFile の 'refused' で受ける。
export function canShareFile(file: File): boolean {
  try {
    return typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] }) === true;
  } catch {
    return false;
  }
}

let inFlight: Promise<ShareOutcome> | null = null;

// タップの処理の中で、最初の文で・await を挟まずに呼ぶ（F22: WebKit は await 1 つで活性を失う）。
// 前の共有が終わる前にもう一度押されたら、新しく呼ばずに前の結果を返す（F22: 二重に呼ぶと NotAllowedError）。
// 取り消し（AbortError）は 'cancelled'、それ以外の拒否（NotAllowedError 等。F19）は 'refused'。
export function shareFile(file: File): Promise<ShareOutcome> {
  if (inFlight) return inFlight;
  let started: Promise<void>;
  try {
    started = navigator.share({ files: [file] });
  } catch (error) {
    return Promise.resolve(shareFailure(error));
  }
  const result = started.then((): ShareOutcome => 'shared', shareFailure).finally(() => { inFlight = null; });
  inFlight = result;
  return result;
}

function shareFailure(error: unknown): ShareOutcome {
  return error instanceof Error && error.name === 'AbortError' ? 'cancelled' : 'refused';
}

const REVOKE_AFTER_MS = 60_000;

// 共有できないブラウザ（PC など）・共有を拒まれた時: <a download> を同期にクリックして保存する（§11「案内なし。ファイル名を表示」）。
export function downloadFile(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
}

// 案内文のコピー。writeText はタップの中で最初に呼ぶ（Safari）。clipboard が無い・拒まれたら false（S9 は長押しで選べる欄を出す）。
export function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator.clipboard?.writeText !== 'function') return Promise.resolve(false);
    return navigator.clipboard.writeText(text).then(() => true, () => false);
  } catch {
    return Promise.resolve(false);
  }
}

// 20MB を超えるファイルは読まずに拒む（§7・Ruling 80-4）。
export async function readBundleText(file: File): Promise<string> {
  if (file.size > BUNDLE_MAX_BYTES) throw new BundleTooLargeError();
  return file.text();
}

// Android の共有（share_target）の受け口の契約（Ruling 79-2・93-3）。Service Worker（src/sw.ts）が POST のファイルを
// Cache の INBOX_CACHE の INBOX_KEY に Response として put し（ヘッダー INBOX_FILE_HEADER に encodeURIComponent したファイル名）、
// S10 へ 303 で送る。S10 はマウント時にこれを呼び、あれば「確認」から始める。読んだら消す（2 回受け取らない）。
// 値の正本は src/share-inbox-contract.ts（SW と同じ物を import する。段7）。
export { INBOX_CACHE, INBOX_KEY };

// 共有されたファイルが大きすぎて SW が書かなかった時の印（段7 レビュー M1）。S10 は「大きすぎ」の枠を出す。
export const INBOX_TOO_LARGE = 'too-large';

export async function takeInboxFile(): Promise<File | typeof INBOX_TOO_LARGE | null> {
  if (typeof caches === 'undefined') return null;
  try {
    const cache = await caches.open(INBOX_CACHE);
    const response = await cache.match(INBOX_KEY);
    if (!response) return null;
    if (response.headers.get(INBOX_TOO_LARGE_HEADER)) {
      await cache.delete(INBOX_KEY);
      return INBOX_TOO_LARGE;
    }
    const blob = await response.blob();
    await cache.delete(INBOX_KEY);
    const header = response.headers.get(INBOX_FILE_HEADER);
    let name = RECEIVED_FILE_FALLBACK;
    try { if (header) name = decodeURIComponent(header); } catch { /* 名前が読めなくても中身は受け取る */ }
    return new File([blob], cleanReceivedFileName(name, RECEIVED_FILE_FALLBACK), { type: blob.type });
  } catch {
    return null;
  }
}

// 新しすぎるファイルの「更新する」（段7 最終レビュー m1）: 再読み込みの前に、読んだファイルを受け口へ戻す。更新の後の S10 はマウント時に
// takeInboxFile でもう一度読み、新しい版なら「確認」から始まる（LINE へ戻って共有し直さなくてよい。選んだファイルも同じ）。
// 受け口は「読んだら消す」のまま（ほかの場面で 2 回受け取らない）。戻せなくても更新は続ける（その時は選び直し）。
export async function returnToInbox(file: File): Promise<void> {
  if (typeof caches === 'undefined') return;
  try {
    await (await caches.open(INBOX_CACHE)).put(INBOX_KEY, inboxResponseFor(file));
  } catch { /* 戻せなくても更新はする */ }
}

// S13「データを全て消す」（Ruling 99-4）: 受け口の Cache を丸ごと消す（読む前の共有されたファイルが残らない）。消せなくても続ける（一時の置き場）
export async function clearInbox(): Promise<void> {
  if (typeof caches === 'undefined') return;
  try { await caches.delete(INBOX_CACHE); } catch { /* 一時の置き場なので続ける */ }
}
