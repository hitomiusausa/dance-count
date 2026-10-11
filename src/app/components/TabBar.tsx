import { buildHash, type ScreenId, type TabId } from '../router/routes.ts';
import { useI18n } from '../state/i18n.ts';

const TABS: Array<{ id: TabId; screen: ScreenId; label: 'tabPractice' | 'tabRoutines' | 'tabSettings' }> = [
  { id: 'practice', screen: 'S1', label: 'tabPractice' },
  { id: 'routines', screen: 'S3', label: 'tabRoutines' },
  { id: 'settings', screen: 'S6', label: 'tabSettings' }
];

// 下タブ（仕様 §3・Ruling 17）。アイコンは段2で足す。文字ラベルは必須。
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
          {translator.t(tab.label)}
        </a>
      ))}
    </nav>
  );
}
