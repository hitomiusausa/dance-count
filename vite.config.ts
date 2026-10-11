import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import pkg from './package.json' with { type: 'json' };

// base:'./' は Capacitor とサブドメイン配信の両方で同じ成果物を使うため（仕様 §10）。
// optimizeDeps.entries を index.html に限定し、legacy/ や旧 HTML（1MB超）を依存スキャンに巻き込まない。
export default defineConfig({
  base: './',
  plugins: [preact()],
  // ルーティンの createdWith.version（仕様 §7・Ruling 37）。src/app/app-version.ts が読む。
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  optimizeDeps: { entries: ['index.html'], include: ['preact', 'preact/hooks', 'preact/jsx-runtime'] },
  server: { port: 5173, strictPort: true },
  preview: { port: 4174, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true }
});
