import { render } from 'preact';
import './platform/launch.ts';   // 最初に: ホーム画面のアプリが S12 で開いたら練習へ（段7 fix 1。ルーターが最初のハッシュを読む前）
import { App } from './App.tsx';
import { configureAudioSession } from './platform/audio-context.ts';
import { captureInstallPrompt } from './platform/pwa.ts';
import { registerServiceWorker } from './platform/pwa-register.ts';
import './styles/base.css';   // 書体（fonts.css）はここで import しない＝描画を止めない別の CSS（vite.config.ts の dc-fonts-stylesheet・段8 Task 9b）

captureInstallPrompt();   // Android の「ホーム画面に追加」を S12 のボタンから出せるように（段7・Ruling 88-4。最初に捕まえる）
configureAudioSession(); // マナーモードでも鳴らす（仕様 §9-1。起動時に1回）
const root = document.getElementById('app');
if (!root) throw new Error('#app is missing from index.html');
render(<App />, root);
registerServiceWorker();   // 公開ビルドだけ SW が入る（dev では何もしない。Ruling 88-5）
