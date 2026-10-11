import type { ComponentType } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { TabBar } from './components/TabBar.tsx';
import { createAppTranslator, resolveAppLocale, type AppLocale } from './i18n/index.ts';
import { deviceLanguages } from './platform/locale.ts';
import { showsTabs, tabOf, type ScreenId } from './router/routes.ts';
import { HomeScreen } from './screens/HomeScreen.tsx';
import { RoutinesScreen } from './screens/RoutinesScreen.tsx';
import { SettingsScreen } from './screens/SettingsScreen.tsx';
import { I18nContext } from './state/i18n.ts';
import { useRoute } from './state/route.ts';

// 段1で中身があるのは S1・S3・S6 だけ。未実装の画面はホームを出す（段2以降でここに足す）。
const SCREEN_COMPONENTS: Partial<Record<ScreenId, ComponentType>> = {
  S1: HomeScreen,
  S3: RoutinesScreen,
  S6: SettingsScreen
};

export function App() {
  const route = useRoute();
  const [locale, setLocale] = useState<AppLocale>(() => resolveAppLocale(deviceLanguages()));
  const i18n = useMemo(() => ({ translator: createAppTranslator(locale), setLocale }), [locale]);
  const screen: ScreenId = SCREEN_COMPONENTS[route.screen] ? route.screen : 'S1';
  const Screen = SCREEN_COMPONENTS[screen] ?? HomeScreen;
  return (
    <I18nContext.Provider value={i18n}>
      <div class="dc-shell" lang={locale}>
        <Screen />
        {showsTabs(screen) && <TabBar current={tabOf(screen)} />}
      </div>
    </I18nContext.Provider>
  );
}
