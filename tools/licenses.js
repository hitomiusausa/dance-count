// 段8（D48 の作業・Ruling 99-3）: 配る物（dist）に同梱するライセンスの全文。public/licenses/ に置き、Vite が dist/licenses/ に写す。
// 正本は node_modules の LICENSE（版を上げたら写し直す。test/tools/licenses.test.js が一致を見る・tools/check-dist.js が dist にあるかを見る）。
// 書体の OFL 1.1 は「書体と一緒にライセンスを配る」ことが条件。Preact・Workbox（MIT）は告知の同梱が条件。
export const LICENSE_FILES = Object.freeze({
  'licenses/Inter-OFL.txt': 'node_modules/@fontsource/inter/LICENSE',
  'licenses/NotoSansJP-OFL.txt': 'node_modules/@fontsource/noto-sans-jp/LICENSE',
  'licenses/Preact-MIT.txt': 'node_modules/preact/LICENSE',
  'licenses/Workbox-MIT.txt': 'node_modules/workbox-precaching/LICENSE'
});
