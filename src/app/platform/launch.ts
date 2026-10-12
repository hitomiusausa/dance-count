import { launchHashFor } from '../lib/install-card.ts';
import { readHash, setHash } from './hash.ts';
import { isStandalone } from './pwa.ts';

// 起動の時に 1 回だけ（段7 fix 1・レビュー I2）。ホーム画面のアプリが S12 のアドレスで開いたら、練習（#/）に置き換える（履歴を積まない）。
// ルーター（state/route.ts）がモジュールの読み込みで最初のハッシュを覚えるので、main.tsx で App より先に import して呼ぶ。
export function applyLaunchHash(): void {
  const next = launchHashFor({ hash: readHash(), standalone: isStandalone() });
  if (next !== null) setHash(next, { replace: true });
}

applyLaunchHash();
