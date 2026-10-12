import { useState } from 'preact/hooks';
import { APP_VERSION } from '../app-version.ts';
import { BackButton } from '../components/BackButton.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { Icon } from '../components/Icon.tsx';
import { ABOUT_PRIVACY_KEYS, ABOUT_TEXT, CONTACT_EMAIL, type AboutKey } from '../i18n/about.ts';
import { PhrasedText, phrased } from '../i18n/phrased.tsx';
import { reloadAtHome } from '../platform/page.ts';
import { clearAllAppData } from '../platform/storage.ts';
import type { UiState } from '../router/routes.ts';
import { useI18n } from '../state/i18n.ts';
import { useStorage } from '../state/storage.ts';

// S13 プライバシー・アプリについて（一覧・親 S6・#/about。仕様 §4 S13・§12・Ruling 99・D47・D48）。
// 文は about.ts（法務確認待ち）。主要操作は 2（問い合わせの mailto・「データを全て消す」）。
// 「データを全て消す」は確認ダイアログ（質問 1 つ・ボタン 2 つ・取り消しが左）→ 3 つのストア・受け口・旧画面の言語の鍵を消して S1 から開き直す。
// 消せなかった時は §11 の型の枠（ボタン無し）。ui-state=confirm-delete-all は確認ダイアログを見た目だけ出す（消さない）。
export function AboutScreen({ uiState }: { uiState?: UiState }) {
  const { translator } = useI18n();
  const storage = useStorage();
  const [confirming, setConfirming] = useState(uiState === 'confirm-delete-all');
  const [failed, setFailed] = useState(false);
  const locale = translator.locale;
  const text = (key: AboutKey, variables?: Record<string, string | number>) =>
    <PhrasedText template={ABOUT_TEXT[locale][key]} phraseKey={key} locale={locale} variables={variables} />;

  const deleteAll = () => {
    setConfirming(false);
    if (uiState === 'confirm-delete-all') return;   // 見た目だけの状態では消さない
    void clearAllAppData(storage).then(reloadAtHome, () => setFailed(true));
  };

  return (
    <main class="dc-screen dc-about" data-screen="S13">
      <BackButton screen="S13" />
      <h1 class="dc-heading">{ABOUT_TEXT[locale].aboutTitle}</h1>
      <p class="dc-body" data-body>{text('aboutApp', { version: APP_VERSION })}</p>
      <p class="dc-body" data-body>{text('aboutOperator')}</p>
      <a class="dc-link-row dc-about-contact" href={`mailto:${CONTACT_EMAIL}`}>
        <span class="dc-link-label">{ABOUT_TEXT[locale].aboutContact}</span>
        <small class="dc-link-value">{CONTACT_EMAIL}</small>
        <Icon name="chev-r" />
      </a>
      <p class="dc-body" data-body>{text('aboutNotOfficial')}</p>
      <h2 class="dc-field-label dc-settings-section">{ABOUT_TEXT[locale].aboutPrivacyHeading}</h2>
      {ABOUT_PRIVACY_KEYS.map(key => <p key={key} class="dc-body" data-body>{text(key)}</p>)}
      <h2 class="dc-field-label dc-settings-section">{ABOUT_TEXT[locale].aboutCreditsHeading}</h2>
      <p class="dc-body" data-body>{text('aboutCreditFonts')}</p>
      <p class="dc-body" data-body>{text('aboutCreditCode')}</p>
      <p class="dc-body" data-body>{text('aboutCreditIcons')}</p>
      {failed && (
        <div class="dc-alert" role="status" data-alert="clear-failed">
          <div class="dc-alert-text dc-alert-text--solo"><b>{phrased(translator, 'clearAllFailed')}</b></div>
        </div>
      )}
      <button type="button" class="dc-button dc-button--secondary dc-wide dc-about-delete" onClick={() => { setFailed(false); setConfirming(true); }}>
        <Icon name="trash" /><span>{translator.t('deleteAllData')}</span>
      </button>
      {confirming && (
        <ConfirmDialog title={phrased(translator, 'confirmDeleteAllTitle')} detail={phrased(translator, 'confirmDeleteAllDetail')}
          confirmLabel={translator.t('confirmDeleteAll')} onCancel={() => setConfirming(false)} onConfirm={deleteAll} />
      )}
    </main>
  );
}
