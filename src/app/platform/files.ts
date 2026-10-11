import { PlatformNotReadyError } from './not-ready.ts';

// 配る（share／download）と受け取る（ファイル選択）。段5で実装（仕様 §8）。
export async function shareOrDownload(_file: File): Promise<'shared' | 'downloaded'> {
  throw new PlatformNotReadyError('file sharing', 5);
}

export async function pickBundleFile(): Promise<File | null> {
  throw new PlatformNotReadyError('file picking', 5);
}
