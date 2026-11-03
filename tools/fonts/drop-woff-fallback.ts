// iOS アプリ（DC_TARGET=ios・npm run ios:build）の書体（docs/app-store/RELEASE-PLAN.md）。
// @fontsource の @font-face は「.woff2、だめなら .woff」。アプリの WebKit（iOS 15 以上）は .woff2 を読むので .woff は一度も使われない。
// postcss の段で src から .woff を外す＝url() が消えるので Vite は .woff を書き出さない（アプリの中身 31MB → 15MB。2026-11-03 実測）。
// Web 版（古いブラウザもある）は外さない。.woff2 の無い @font-face は触らない（書体が消えないように）。
export interface FontSrcDeclaration { value: string; parent?: { type?: string; name?: string } }

export function withoutWoffFallback(value: string): string {
  const sources = value.split(/,(?=\s*url\()/);
  const kept = sources.filter(source => !/\.woff\)\s*format\(['"]woff['"]\)/.test(source));
  return kept.length && kept.length !== sources.length && kept.some(source => /format\(['"]woff2['"]\)/.test(source)) ? kept.join(',') : value;
}

export const dropWoffFallback = {
  postcssPlugin: 'dc-drop-woff-fallback',
  Declaration: {
    src(decl: FontSrcDeclaration) {
      if (decl.parent?.type === 'atrule' && decl.parent.name === 'font-face') decl.value = withoutWoffFallback(decl.value);
    }
  }
};
