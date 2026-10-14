import qrcode from 'qrcode-generator';
import { PUBLIC_APP_URL, withExternalBrowser } from '../app-url.ts';

// D74 教室に貼る案内の QR コード。端末の中だけで作る（qrcode-generator・MIT。ネットには出ない＝オフラインでも作れる）。
// 正式の URL（公開ビルドの PUBLIC_APP_URL が空の開発中だけ使う）
export const CANONICAL_APP_URL = 'https://count.dancemap.jp';
// 誤り訂正 M（約 15%。印刷の汚れ・折り目に耐え、目が細かくなりすぎない）
const ERROR_CORRECTION = 'M';
// 周りの白（QR の決まりの静かな域＝4 マス）
export const QR_QUIET_ZONE = 4;

// 貼り紙の QR が開く URL。LINE の QR リーダーで読んでも Safari／Chrome で開く印を付ける（F26・案内文と同じ）
export function posterAppUrl(appUrl: string = PUBLIC_APP_URL): string {
  const base = appUrl || CANONICAL_APP_URL;
  return withExternalBrowser(base) ?? base;
}

// 紙に書く短いアドレス（https:// と末尾の / を落とす。QR が読めない人が手で打つ用）
export function posterAddressText(appUrl: string = PUBLIC_APP_URL): string {
  return (appUrl || CANONICAL_APP_URL).replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

// 黒いマスの表（行 → 列）。true＝黒
export function qrModules(text: string): boolean[][] {
  const code = qrcode(0, ERROR_CORRECTION);
  code.addData(text, 'Byte');
  code.make();
  const size = code.getModuleCount();
  return Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, col) => code.isDark(row, col)));
}

// SVG の 1 本の path（1 マス＝1 単位。静かな域を含む viewBox）。拡大しても滲まない（印刷向け）
export function qrSvg(text: string, { title }: { title: string }): string {
  const modules = qrModules(text);
  const size = modules.length + QR_QUIET_ZONE * 2;
  let path = '';
  modules.forEach((row, y) => row.forEach((dark, x) => { if (dark) path += `M${x + QR_QUIET_ZONE} ${y + QR_QUIET_ZONE}h1v1h-1z`; }));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="${escapeAttribute(title)}" shape-rendering="crispEdges">`
    + `<rect width="${size}" height="${size}" fill="#fff"/><path fill="#000" d="${path}"/></svg>`;
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
