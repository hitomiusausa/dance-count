// 段8（D48 の作業・Ruling 99-3）: 配る物（dist）に同梱するライセンスの全文。public/licenses/ に置き、Vite が dist/licenses/ に写す。
// 正本は node_modules の LICENSE（版を上げたら写し直す。test/tools/licenses.test.js が一致を見る・tools/check-dist.js が dist にあるかを見る）。
// 書体の OFL 1.1 は「書体と一緒にライセンスを配る」ことが条件。Preact・Workbox（MIT）は告知の同梱が条件。
export const LICENSE_FILES = Object.freeze({
  'licenses/Inter-OFL.txt': 'node_modules/@fontsource/inter/LICENSE',
  'licenses/NotoSansJP-OFL.txt': 'node_modules/@fontsource/noto-sans-jp/LICENSE',
  'licenses/Preact-MIT.txt': 'node_modules/preact/LICENSE',
  'licenses/Workbox-MIT.txt': 'node_modules/workbox-precaching/LICENSE',
  // アイコン（icons.svg の repeat・chevron-down は Lucide のパスと一致、gear ほかも Lucide 系の疑い）。lucide は依存ではないので、LICENSE（ISC＋Feather の MIT）を third_party に置く
  'licenses/Lucide-ISC.txt': 'third_party/lucide/LICENSE',
  // D74 教室に貼る案内の QR（qrcode-generator 2.0.4・MIT）。npm の包みに LICENSE の文書が無い（MIT の告知はソースの頭だけ）ので、
  // ソースの頭の告知（著作権者・URL・QR コードの商標）と MIT の全文を third_party に置く
  'licenses/QRCodeGenerator-MIT.txt': 'third_party/qrcode-generator/LICENSE'
});
