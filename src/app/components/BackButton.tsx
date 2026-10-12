import { parentScreen, type ScreenId } from '../router/routes.ts';
import { useI18n } from '../state/i18n.ts';
import { goBack } from '../state/route.ts';
import { Icon } from './Icon.tsx';

// 左上の「‹ 戻る」（Ruling 17）。止める処理は各画面のアンマウントで行う（Ruling 32）。
// D56（Ruling 116-2）: 親が表紙の画面（U1・U2・M0・S6）は「‹ 表紙」。goBack が 1 回で表紙に着ける（見てきた列の一番近い表紙まで戻る・無ければ表紙へ置き換え）
export function BackButton({ screen }: { screen: ScreenId }) {
  const { translator } = useI18n();
  return (
    <button type="button" class="dc-back" data-back onClick={() => goBack(screen)}>
      <Icon name="chev-l" />
      <span>{translator.t(parentScreen(screen) === 'S0' ? 'backToCover' : 'back')}</span>
    </button>
  );
}
