import type { ComponentType } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { DANCE_PROFILES } from '../engine/dance-profiles.js';
import { IconSprite } from './components/Icon.tsx';
import { TabBar } from './components/TabBar.tsx';
import { createAppTranslator, resolveAppLocale, type AppLocale } from './i18n/index.ts';
import { forgetLegacyUiLocale, readLegacyUiLocale } from './platform/legacy-locale.ts';
import { deviceLanguages } from './platform/locale.ts';
import { applyDocumentLanguage } from './platform/page.ts';
import { openAppStorage, type AppStorage } from './platform/storage.ts';
import { showsTabs, tabOf, type Route, type ScreenId } from './router/routes.ts';
import { HomeScreen } from './screens/HomeScreen.tsx';
import { PracticeScreen } from './screens/PracticeScreen.tsx';
import { RoutinesScreen } from './screens/RoutinesScreen.tsx';
import { SettingsScreen } from './screens/SettingsScreen.tsx';
import { SoundHelpScreen } from './screens/SoundHelpScreen.tsx';
import { VoicesScreen } from './screens/VoicesScreen.tsx';
import type { Routine } from './routines/routine.ts';
import { deleteRoutine, loadRoutines, saveRoutine, sortRoutines } from './routines/store.ts';
import { DEFAULT_SETTINGS, forgetRoutineSettings, type AppSettings } from './settings/settings.ts';
import { loadSettings, saveSettings } from './settings/store.ts';
import { I18nContext } from './state/i18n.ts';
import { RoutinesContext, type RoutinesValue } from './state/routines.ts';
import { useRoute } from './state/route.ts';
import { SettingsContext } from './state/settings.ts';

// 端末の保存領域が開くのをこれ以上は待たない（固まっても画面を出す。以後このセッションでは使わない）。
const STORAGE_OPEN_TIMEOUT_MS = 1500;

function openStorageWithin(ms: number): Promise<AppStorage | null> {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(null), ms);
    openAppStorage().then(
      opened => { clearTimeout(timer); resolve(opened); },
      () => { clearTimeout(timer); resolve(null); }
    );
  });
}

// 中身がある画面だけ登録する。未実装の画面はホームを出す（段3以降でここに足す）。
const SIMPLE_SCREENS: Partial<Record<ScreenId, ComponentType>> = {
  S1: HomeScreen,
  S3: RoutinesScreen,
  S6: SettingsScreen,
  S7: VoicesScreen,
  S11: SoundHelpScreen
};

// S2 は種目が分かる時だけ。知らない種目・未実装の画面はホーム。
export function resolveScreen(route: Route): ScreenId {
  if (route.screen === 'S2') return route.params.danceId && Object.hasOwn(DANCE_PROFILES, route.params.danceId) ? 'S2' : 'S1';
  return SIMPLE_SCREENS[route.screen] ? route.screen : 'S1';
}

export function App() {
  const route = useRoute();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const storage = useRef<AppStorage | null>(null);
  const current = useRef<AppSettings>(DEFAULT_SETTINGS);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const currentRoutines = useRef<Routine[]>([]);

  // 設定とルーティンを読み終えてから描画する（前回カードのちらつき防止。Ruling 26）。開けなければ既定値で続行。
  useEffect(() => {
    let alive = true;
    openStorageWithin(STORAGE_OPEN_TIMEOUT_MS)
      .then(opened => {
        storage.current = opened;
        return Promise.all([loadSettings(opened, { read: readLegacyUiLocale, forget: forgetLegacyUiLocale }), loadRoutines(opened)]);
      })
      .then(([loaded, savedRoutines]) => {
        if (!alive) return;
        current.current = loaded;
        currentRoutines.current = savedRoutines;
        setRoutines(savedRoutines);
        setSettings(loaded);
      });
    return () => { alive = false; };
  }, []);

  const update = useCallback((patch: Partial<AppSettings>) => {
    current.current = { ...current.current, ...patch };
    setSettings(current.current);
    void saveSettings(storage.current, patch);
  }, []);

  const routinesValue = useMemo<RoutinesValue>(() => ({
    routines,
    save(routine) {
      currentRoutines.current = sortRoutines([...currentRoutines.current.filter(item => item.id !== routine.id), routine]);
      setRoutines(currentRoutines.current);
      return saveRoutine(storage.current, routine);
    },
    remove(id) {
      currentRoutines.current = currentRoutines.current.filter(item => item.id !== id);
      setRoutines(currentRoutines.current);
      update(forgetRoutineSettings(current.current, id));
      return deleteRoutine(storage.current, id);
    }
  }), [routines, update]);

  const locale: AppLocale = settings?.uiLocale ?? resolveAppLocale(deviceLanguages());
  const translator = useMemo(() => createAppTranslator(locale), [locale]);
  const i18n = useMemo(() => ({ translator, setLocale: (next: AppLocale) => update({ uiLocale: next }) }), [translator, update]);
  useEffect(() => applyDocumentLanguage(locale, translator.t('documentTitle')), [locale, translator]);

  if (!settings) return null;
  const screen = resolveScreen(route);
  const Simple = SIMPLE_SCREENS[screen] ?? HomeScreen;
  return (
    <I18nContext.Provider value={i18n}>
      <SettingsContext.Provider value={{ settings, update }}>
        <RoutinesContext.Provider value={routinesValue}>
          <div class="dc-shell" lang={locale}>
            <IconSprite />
            {screen === 'S2'
              ? <PracticeScreen key={route.params.danceId} danceId={route.params.danceId!} uiState={route.query.uiState} />
              : <Simple />}
            {showsTabs(screen) && <TabBar current={tabOf(screen)} />}
          </div>
        </RoutinesContext.Provider>
      </SettingsContext.Provider>
    </I18nContext.Provider>
  );
}
