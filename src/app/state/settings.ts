import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import { DEFAULT_SETTINGS, type AppSettings } from '../settings/settings.ts';

// 画面から設定を読む・変える入口。保存は App が受け持つ（変更のたびに read-merge-write。Ruling 26）。
export interface SettingsValue { settings: AppSettings; update(patch: Partial<AppSettings>): void }

export const SettingsContext = createContext<SettingsValue>({ settings: DEFAULT_SETTINGS, update: () => {} });

export function useSettings(): SettingsValue {
  return useContext(SettingsContext);
}
