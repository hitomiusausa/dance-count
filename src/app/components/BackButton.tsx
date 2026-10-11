import type { ScreenId } from '../router/routes.ts';
import { useI18n } from '../state/i18n.ts';
import { goBack } from '../state/route.ts';
import { Icon } from './Icon.tsx';

// 左上の「‹ 戻る」（Ruling 17）。止める処理は各画面のアンマウントで行う（Ruling 32）。
export function BackButton({ screen }: { screen: ScreenId }) {
  const { translator } = useI18n();
  return (
    <button type="button" class="dc-back" data-back onClick={() => goBack(screen)}>
      <Icon name="chev-l" />
      <span>{translator.t('back')}</span>
    </button>
  );
}
