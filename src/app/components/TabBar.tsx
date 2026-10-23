import { buildHash, type ScreenId, type TabId } from '../router/routes.ts';
import { useI18n } from '../state/i18n.ts';
import { replaceRoute } from '../state/route.ts';
import type { IconName } from './icon-names.ts';
import { musicPreviewEnabled } from '../platform/music.ts';
import { Icon } from './Icon.tsx';

// 2026-10-23: 「使う」はフィガー・ルーティン・音楽の3入口。音楽は開発プレビューの間だけ表示。
const TABS: Array<{ id: TabId; screen: ScreenId; icon: IconName; label: 'tabFigures' | 'tabRoutines' | 'tabMusic' }> = [
  { id: 'practice', screen: 'S1', icon: 'home', label: 'tabFigures' },
  { id: 'routines', screen: 'U2', icon: 'list', label: 'tabRoutines' },
  { id:'music',screen:'U3',icon:'play',label:'tabMusic' }
];

// 下タブ（仕様 §3・Ruling 17）。アイコン＋文字。1024px 以上は CSS だけで上部に移る（Ruling 21）。
// タブの切替は履歴を積まない（置き換え）: 「‹ 表紙」（履歴があれば 1 つ戻る）と iPhone の戻るスワイプが、どちらのタブからでも表紙に着く
// （積むと U1 → U2 の後の「‹ 表紙」が U1 に戻ってしまう。Ruling 116-2 の読み替え＝計画者の発見）。
export function TabBar({ current }: { current: TabId }) {
  const { translator } = useI18n();
  return (
    <nav class="dc-tabs" data-nav aria-label={translator.t('navLabel')}>
      {TABS.filter(tab=>tab.id!=='music'||musicPreviewEnabled()).map(tab => (
        <a
          key={tab.id}
          class="dc-tab"
          href={buildHash({ screen: tab.screen, params: {} })}
          aria-current={tab.id === current ? 'page' : undefined}
          onClick={event => { event.preventDefault(); if (tab.id !== current) replaceRoute({ screen: tab.screen, params: {} }); }}
        >
          <Icon name={tab.icon} />
          <span>{translator.t(tab.label)}</span>
        </a>
      ))}
    </nav>
  );
}
