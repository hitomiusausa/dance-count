import type { AppStorage } from '../platform/storage.ts';
import { DEFAULT_SETTINGS, SETTINGS_KEY, normalizeSettings, type AppSettings } from './settings.ts';

// 設定の読み書き（Ruling 26）。settings ストアの1レコード（key 'app'、schemaVersion 1）。
// 書きは read-merge-write: 別タブや後の段が足した項目を消さない。失敗は投げずに false（設定は失って困らない）。
export const SETTINGS_SCHEMA_VERSION = 1;

export interface LegacyLocaleSource { read(): string | null; forget(): void }

export async function loadSettings(storage: AppStorage | null, legacy: LegacyLocaleSource): Promise<AppSettings> {
  let saved: unknown;
  try { saved = await storage?.get('settings', SETTINGS_KEY); } catch { saved = undefined; }
  const settings = normalizeSettings(saved);
  if (settings.uiLocale !== null) return settings;
  const legacyLocale = normalizeSettings({ uiLocale: legacy.read() }).uiLocale;
  if (legacyLocale === null) return settings;
  const migrated = { ...settings, uiLocale: legacyLocale };
  if (await saveSettings(storage, { uiLocale: legacyLocale })) legacy.forget();
  return migrated;
}

// 連続した保存が互いの項目を消さないように直列化する（read-merge-write が交差すると先の項目が失われる）。
let saveChain: Promise<unknown> = Promise.resolve();

export function saveSettings(storage: AppStorage | null, patch: Partial<AppSettings>): Promise<boolean> {
  const result = saveChain.then(() => writeSettings(storage, patch));
  saveChain = result;
  return result;
}

async function writeSettings(storage: AppStorage | null, patch: Partial<AppSettings>): Promise<boolean> {
  if (!storage) return false;
  try {
    const current = await storage.get<Record<string, unknown>>('settings', SETTINGS_KEY);
    const base = current && typeof current === 'object' ? current : {};
    await storage.put('settings', { ...base, ...patch, schemaVersion: SETTINGS_SCHEMA_VERSION }, SETTINGS_KEY);
    return true;
  } catch {
    return false;
  }
}

export { DEFAULT_SETTINGS };
