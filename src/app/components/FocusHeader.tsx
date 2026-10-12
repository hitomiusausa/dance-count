import type { ScreenId } from '../router/routes.ts';
import { BackButton } from './BackButton.tsx';

// 集中画面の上の行（「‹ 戻る」＋画面の名前）。段8（Ruling 102-3）: 画面には見出し h1 がちょうど 1 つ。
// 本文に大きい見出し（h1.dc-heading）が無い画面・段階では、この画面の名前を h1 にする（VoiceOver が「どの画面か」を最初に読める）。
export function FocusHeader({ screen, title, heading }: { screen: ScreenId; title: string; heading: boolean }) {
  return (
    <header class="dc-focus-head">
      <BackButton screen={screen} />
      {heading ? <h1 class="dc-focus-title">{title}</h1> : <span class="dc-focus-title">{title}</span>}
    </header>
  );
}
