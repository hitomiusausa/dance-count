// S13「プライバシー・アプリについて」の文（段8・Ruling 99・D47・D48）。messages.ts に長文を詰めないため別のファイル。
// **法務確認待ち（ひとみうさ／法務）**: アプリが実際にすること・しないことだけを書く（2026-10-12 にコードで確かめた事実。計画 段8 Task 4 の棚卸し）。
// 法的な約束（準拠法・免責・損害賠償・保証）は書かない。D47-2 の「外部の書体の読み込み」は禁止語（読み込み）に当たるので「書体も外部から取り寄せません」（段8 計画者の発見）。直すのはこのファイルだけ（test/app/i18n.test.ts が鍵の一致・順・禁止語を見る）。
// 英語は初版（Ruling 96-2 の一次案の対象）。{version} は APP_VERSION（package.json の version）。
export const ABOUT_TEXT = {
  en: {
    aboutTitle: 'About Dance Count',
    aboutApp: 'Dance Count — for Ballroom · Version\u00A0{version}',   // 「Version」と番号を折らない
    aboutOperator: 'Operated by Kuga Inc.',
    aboutContact: 'Contact',
    aboutNotOfficial: 'The counts in this app are not official and have not been reviewed by any organization.',
    aboutPrivacyHeading: 'Privacy',
    aboutPrivacy1: 'Recorded voices, received voices, routines and settings are saved only on this device. The operator (Kuga Inc.) never receives them.',
    aboutPrivacy2: 'This app has no way to collect how it is used or to send anything out (no analytics, no ads, and fonts are not fetched from other sites).',
    aboutPrivacy3: "The server that delivers the app's files (screens, sounds and fonts) may record what browsers normally send, such as the time of access.",
    aboutPrivacy4: 'The microphone is used only on the voice recording screen: when you allow access, and for 1.5 seconds after you tap “Record”. It is closed right after. Recordings stay on this device, and you can delete them at any time.',
    aboutPrivacy5: "A file made with “Share” contains your name and the voice and routines you put in it. You decide who gets it. Sending it by LINE or email follows the rules of those services. A file you receive contains the sender's name and voice.",
    aboutPrivacy6: 'You can delete the data with “Delete all data” on this screen, or in your browser settings (delete the site data). On iPhone, Safari and the app added to the Home Screen keep their data separately. Only the one you have open is deleted.',
    aboutCreditsHeading: 'Credits',
    aboutCreditFonts: 'Fonts: Inter and Noto Sans JP (SIL Open Font License 1.1)',
    aboutCreditCode: 'Preact and Workbox (MIT License)'
  },
  'ja-JP': {
    aboutTitle: 'Dance Count について',
    aboutApp: 'Dance Count — for Ballroom　版\u00A0{version}',
    aboutOperator: '運営：くうが株式会社',
    aboutContact: '問い合わせ',
    aboutNotOfficial: 'このアプリのカウントは、公式のもの・監修を受けたものではありません。',
    aboutPrivacyHeading: 'プライバシー',
    aboutPrivacy1: '録音した声・受け取った声・ルーティン・設定は、この端末の中にだけ保存されます。運営者（くうが株式会社）がこれらを受け取ることはありません。',
    aboutPrivacy2: 'このアプリは、利用状況を集めたり、外部に送ったりする仕組みを持っていません（解析ツール・広告はなく、書体も外部から取り寄せません）。',
    aboutPrivacy3: 'アプリのファイル（画面・音声・書体）を配信するサーバーには、ブラウザが通常送る情報（アクセスの日時など）が記録されることがあります。',
    aboutPrivacy4: 'マイクは、声を録音する画面でだけ使います。許可を取る時と、「録音する」を押した後の 1.5 秒だけ開き、すぐ閉じます。録音した声はこの端末に残り、いつでも消せます。',   // 1.5 秒 = TAKE_MS（platform/recorder.ts）。許可を取る時も開いてすぐ閉じる（requestMicrophone）,
    aboutPrivacy5: '「配る」で作ったファイルには、あなたの名前と、入れた声・ルーティンが入ります。誰に渡すかは、あなた自身が決めます。LINE やメールでの受け渡しは、それぞれのサービスの決まりに従います。受け取ったファイルには、送った人の名前と声が入っています。',
    aboutPrivacy6: 'データは、この画面の「データを全て消す」か、ブラウザの設定（サイトのデータの削除）で消せます。iPhone では、Safari とホーム画面に追加したアプリで保存場所が別々です。消すのは、いま開いている方だけです。',
    aboutCreditsHeading: '使っているもの',
    aboutCreditFonts: '書体：Inter・Noto Sans JP（SIL Open Font License 1.1）',
    aboutCreditCode: 'Preact・Workbox（MIT License）'
  }
} as const satisfies Record<string, Record<string, string>>;

export type AboutKey = keyof typeof ABOUT_TEXT['en'];
// 画面に出す順（段落の順を en／ja で同じにする。test/app/i18n.test.ts）
export const ABOUT_PRIVACY_KEYS = ['aboutPrivacy1', 'aboutPrivacy2', 'aboutPrivacy3', 'aboutPrivacy4', 'aboutPrivacy5', 'aboutPrivacy6'] as const satisfies readonly AboutKey[];
// 問い合わせ先（D9・仕様 §12）。mailto: と文字の両方に出す（PC で既定のメールが無くても、アドレスは見えている）
export const CONTACT_EMAIL = 'info@kugainc.com';
