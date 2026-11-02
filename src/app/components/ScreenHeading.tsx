import type { MessageKey } from '../i18n/index.ts';
import type { ScreenId } from '../router/routes.ts';
import { BackButton } from './BackButton.tsx';
import { InfoButton } from './InfoButton.tsx';

// 画面の上（「‹ 戻る」の行 → 大きい見出し h1.dc-heading）。M1「ルーティンを作る・直す」の形を S8・S9・S10・U2 でもそろえる（D67・ひとみうさ指示 2026-10-14）。
// info があれば見出しの横に ⓘ（D66）。説明の箱は .dc-title-row の下端に重なって出る（下の物を動かさない）。
// 画面には h1 がちょうど 1 つ（Ruling 102-3）。段階ごとに本文の見出しが替わる画面（S8 の完成・S10 の確認と受け取った）は title にその見出しを渡す。
export function ScreenHeading({ screen, title, info }: { screen: ScreenId; title: string; info?: MessageKey }) {
  return (
    <>
      <BackButton screen={screen} />
      <div class="dc-title-row">
        <h1 class="dc-heading">{title}</h1>
        {info && <InfoButton textKey={info} />}
      </div>
    </>
  );
}
