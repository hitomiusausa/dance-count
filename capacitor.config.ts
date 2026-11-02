import type { CapacitorConfig } from '@capacitor/cli';

// iOS アプリ（App Store 版）の殻（docs/app-store/RELEASE-PLAN.md）。中身は Web 版と同じ dist（vite の base:'./'＝仕様 §10「Capacitor 前提」）。
// 端末の違いは src/app/platform/ だけで吸収する（Ruling 1）。appId は App Store Connect に登録する Bundle ID と一致させる（登録後は変えられない）。
const config: CapacitorConfig = {
  appId: 'jp.dancemap.count',
  appName: 'Dance Count',
  webDir: 'dist',
  ios: {
    // 起動の殻（index.html）と同じ紺。WebView が描く前の白いちらつきを避ける（D62）
    backgroundColor: '#1B2A4A',
    contentInset: 'never',
    // 音のタイミングを遅らせない: WebView のリンクのプレビュー（長押し）を出さない
    allowsLinkPreview: false
  }
};

export default config;
