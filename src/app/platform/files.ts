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

// Android の共有（share_target）の受け口の契約（Ruling 79-2）。段7の Service Worker が POST の 'bundle' を
// cache 'dance-count-inbox' の './inbox/bundle' に Response として put し（ヘッダー 'X-File-Name' に encodeURIComponent したファイル名）、
// './#/receive' へ 303 で送る。S10 はマウント時にこれを呼び、あれば「確認」から始める。読んだら消す（2 回受け取らない）。
export const INBOX_CACHE = 'dance-count-inbox';
export const INBOX_KEY = './inbox/bundle';

export async function takeInboxFile(): Promise<File | null> {
  if (typeof caches === 'undefined') return null;
  try {
    const cache = await caches.open(INBOX_CACHE);
    const response = await cache.match(INBOX_KEY);
    if (!response) return null;
    const blob = await response.blob();
    await cache.delete(INBOX_KEY);
    const header = response.headers.get('X-File-Name');
    let name = RECEIVED_FILE_FALLBACK;
    try { if (header) name = decodeURIComponent(header); } catch { /* 名前が読めなくても中身は受け取る */ }
    return new File([blob], cleanReceivedFileName(name, RECEIVED_FILE_FALLBACK), { type: blob.type });
  } catch {
    return null;
  }
}
