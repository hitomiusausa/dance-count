import { usePwaUpdate } from '../platform/pwa.ts';
import { phrased } from '../i18n/phrased.tsx';
import { useI18n } from '../state/i18n.ts';
import { useRoute } from '../state/route.ts';

// 更新の帯（段7・Ruling 90-2・90-3・D45）。新しい版が待っている時だけ、ルート・一覧の画面（S1 の最下段・S3・S6・S7 の見出しの下）に 1 行。
// 「更新する」で切り替えて再読み込み。閉じるボタンは無い（放っておいても、アプリを完全に閉じて開けば新しい版になる）。
// 集中画面（再生・録音・編集）には置かない＝再生を切らない。[data-alert] の枠の型（Ruling 23・30）。
export function UpdateBanner() {
  const { translator } = useI18n();
  const { updateReady, applyUpdate } = usePwaUpdate(useRoute().query.uiState);
  if (!updateReady) return null;
  return (
    <div class="dc-alert dc-update" role="status" data-alert="update">
      <div class="dc-alert-text"><b>{phrased(translator, 'updateReady')}</b></div>
      <button type="button" class="dc-alert-action" data-alert-action onClick={applyUpdate}>{translator.t('updateApp')}</button>
    </div>
  );
}
