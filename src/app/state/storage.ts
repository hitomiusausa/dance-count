import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { AppStorage } from '../platform/storage.ts';

// 端末の保存領域（App が起動時に開いた物。開けなかった端末は null）。声の画面（S7・S8）と再生の声の解決が使う。
export const StorageContext = createContext<AppStorage | null>(null);

export function useStorage(): AppStorage | null {
  return useContext(StorageContext);
}
