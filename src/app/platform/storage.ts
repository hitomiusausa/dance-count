import { PlatformNotReadyError } from './not-ready.ts';

// IndexedDB dance-count-v2 を v2 へ（routines・settings ストア追加、仕様 §7）。段3で実装。
export interface AppStorage {
  get<T>(store: 'routines' | 'settings' | 'voice-packs', key: string): Promise<T | undefined>;
  put<T>(store: 'routines' | 'settings' | 'voice-packs', key: string, value: T): Promise<void>;
}

export async function openAppStorage(): Promise<AppStorage> {
  throw new PlatformNotReadyError('app storage', 3);
}
