// アプリ（新UI）の文言。キーは全言語で完全一致させる（test/app/i18n.test.ts が検査）。
// 英語は初版。段8で監修する。旧画面の文言は src/engine/ui-messages.js に残す（legacy/ が使う）。
export const APP_MESSAGES = {
  en: {
    appName: 'Dance Count',
    appSubtitle: 'for Ballroom',
    documentTitle: 'Dance Count — for Ballroom',
    switchLanguage: '日本語',
    tabPractice: 'Practice',
    tabRoutines: 'Routines',
    tabSettings: 'Settings',
    navLabel: 'Main',
    back: 'Back',
    chooseDance: 'Choose a dance',
    routinesTitle: 'Routines',
    routinesEmpty: 'No routines yet',
    settingsTitle: 'Settings',
    settingsLanguage: 'Language'
  },
  'ja-JP': {
    appName: 'Dance Count',
    appSubtitle: 'for Ballroom',
    documentTitle: 'Dance Count — for Ballroom',
    switchLanguage: 'English',
    tabPractice: '練習',
    tabRoutines: 'ルーティン',
    tabSettings: '設定',
    navLabel: 'メイン',
    back: '戻る',
    chooseDance: '種目を選んでください',
    routinesTitle: 'ルーティン',
    routinesEmpty: 'まだルーティンはありません',
    settingsTitle: '設定',
    settingsLanguage: '言語'
  }
} as const satisfies Record<string, Record<string, string>>;

export type AppLocale = keyof typeof APP_MESSAGES;
export type MessageKey = keyof typeof APP_MESSAGES['en'];
