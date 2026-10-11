// 公開 URL（仕様 §16-1・Ruling 82-7）。ビルド時に `PUBLIC_APP_URL=https://… npm run build` で埋める（vite.config.ts の define）。
// 空（開発中・Node のテスト）なら案内文の「アプリ:」の行ごと出さない。
declare const __PUBLIC_APP_URL__: string | undefined;
export const PUBLIC_APP_URL: string = typeof __PUBLIC_APP_URL__ === 'string' ? __PUBLIC_APP_URL__ : '';

// LINE のトークから開いた時に、LINE の中でなく Safari／Chrome で開かせる印（F26。ハッシュの前のクエリなのでアプリは読まない）。
// 正しい URL でなければ null。
export function withExternalBrowser(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    parsed.searchParams.set('openExternalBrowser', '1');
    return parsed.toString();
  } catch {
    return null;
  }
}
