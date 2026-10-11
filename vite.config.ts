import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import pkg from './package.json' with { type: 'json' };

// base:'./' は Capacitor とサブドメイン配信の両方で同じ成果物を使うため（仕様 §10）。
// optimizeDeps.entries を index.html に限定し、legacy/ や旧 HTML（1MB超）を依存スキャンに巻き込まない。
export default defineConfig({
  base: './',
  plugins: [preact()],
  // ルーティンの createdWith.version（仕様 §7・Ruling 37）。src/app/app-version.ts が読む。
  // 案内文の公開 URL（§16-1・Ruling 82-7）。src/app/app-url.ts が読む。公開前に PUBLIC_APP_URL=https://… npm run build。
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __PUBLIC_APP_URL__: JSON.stringify(process.env.PUBLIC_APP_URL ?? '') },
  optimizeDeps: { entries: ['index.html'], include: ['preact', 'preact/hooks', 'preact/jsx-runtime'] },
  server: { port: 5173, strictPort: true },
  preview: { port: 4174, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true }
});
