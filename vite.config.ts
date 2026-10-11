import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// base:'./' は Capacitor とサブドメイン配信の両方で同じ成果物を使うため（仕様 §10）。
// optimizeDeps.entries を index.html に限定し、legacy/ や旧 HTML（1MB超）を依存スキャンに巻き込まない。
export default defineConfig({
  base: './',
  plugins: [preact()],
  optimizeDeps: { entries: ['index.html'] },
  server: { port: 5173, strictPort: true },
  preview: { port: 4174, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true }
});
