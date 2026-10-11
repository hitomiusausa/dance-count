import { buildHash, type ScreenId, type TabId } from '../router/routes.ts';
import { useI18n } from '../state/i18n.ts';
import type { IconName } from './icon-names.ts';
import { Icon } from './Icon.tsx';

const TABS: Array<{ id: TabId; screen: ScreenId; icon: IconName; label: 'tabPractice' | 'tabRoutines' | 'tabSettings' }> = [
  { id: 'practice', screen: 'S1', icon: 'home', label: 'tabPractice' },
  { id: 'routines', screen: 'S3', icon: 'list', label: 'tabRoutines' },
  { id: 'settings', screen: 'S6', icon: 'gear', label: 'tabSettings' }
];

// 下タブ（仕様 §3・Ruling 17）。アイコン＋文字。1024px 以上は CSS だけで上部に移る（Ruling 21）。
export function TabBar({ current }: { current: TabId }) {
  const { translator } = useI18n();
  return (
    <nav class="dc-tabs" data-nav aria-label={translator.t('navLabel')}>
      {TABS.map(tab => (
        <a
          key={tab.id}
          class="dc-tab"
          href={buildHash({ screen: tab.screen, params: {} })}
          aria-current={tab.id === current ? 'page' : undefined}
        >
          <Icon name={tab.icon} />
          <span>{translator.t(tab.label)}</span>
        </a>
      ))}
    </nav>
  );
}
