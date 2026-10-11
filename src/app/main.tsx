import { render } from 'preact';
import { App } from './App.tsx';
import { configureAudioSession } from './platform/audio-context.ts';
import './styles/fonts.css';
import './styles/base.css';

configureAudioSession(); // マナーモードでも鳴らす（仕様 §9-1。起動時に1回）
const root = document.getElementById('app');
if (!root) throw new Error('#app is missing from index.html');
render(<App />, root);
