import { useMemo, useState } from 'preact/hooks';
import { PosterMark } from '../brand/BrandMark.tsx';
import { Icon } from '../components/Icon.tsx';
import { ScreenHeading } from '../components/ScreenHeading.tsx';
import type { MessageKey } from '../i18n/index.ts';
import { phrased } from '../i18n/phrased.tsx';
import { printPage } from '../platform/page.ts';
import { posterAddressText, posterAppUrl, qrSvg } from '../poster/qr.ts';
import { cleanSchoolName, SCHOOL_NAME_MAX } from '../poster/school-name.ts';
import { useI18n } from '../state/i18n.ts';

const STEPS: Array<{ title: MessageKey; body: MessageKey }> = [
  { title: 'posterStep1Title', body: 'posterStep1' },
  { title: 'posterStep2Title', body: 'posterStep2' },
  { title: 'posterStep3Title', body: 'posterStep3' }
];

// S14 教室に貼る案内（D74・ひとみうさ承認 2026-10-15。設定の「このアプリについて」から）。
// 上: 教室の名前（任意・端末には残さない）・見本。下の帯: 「印刷する／PDF で保存」（window.print。PDF は印刷の画面で選ぶ）。
// 印刷では見本の紙（.dc-poster）だけを A4 縦 1 枚に出す（base.css の @media print）。QR は端末の中で作る（poster/qr.ts・ネットに出ない）。
export function PosterScreen() {
  const { translator } = useI18n();
  const [school, setSchool] = useState('');
  const [printFailed, setPrintFailed] = useState(false);
  const address = posterAddressText();
  const qr = useMemo(() => qrSvg(posterAppUrl(), { title: translator.t('posterQrLabel', { address }) }), [translator.locale, address]);
  const name = cleanSchoolName(school);
  const print = () => setPrintFailed(!printPage(translator.t('posterDocumentTitle')));

  return (
    <main class="dc-screen dc-screen--dock dc-poster-screen" data-screen="S14">
      <ScreenHeading screen="S14" title={translator.t('posterTitle')} />
      <p class="dc-body">{phrased(translator, 'posterIntro')}</p>
      <div class="dc-field" data-group="poster-school">
        <div class="dc-field-label" id="dc-s14-school-label">{translator.t('posterSchoolLabel')}</div>
        <input class="dc-input" type="text" value={school} maxLength={SCHOOL_NAME_MAX * 2} enterKeyHint="done" autoComplete="organization" aria-labelledby="dc-s14-school-label"
          placeholder={translator.t('posterSchoolPlaceholder')}
          onInput={event => { const input = event.currentTarget as HTMLInputElement; const next = cleanSchoolName(input.value, { keepEdges: true }); if (next !== input.value) input.value = next; setSchool(next); }}
          onKeyDown={event => { if (event.key === 'Enter') (event.currentTarget as HTMLInputElement).blur(); }} />
      </div>
      {printFailed && <div class="dc-hint" role="status">{phrased(translator, 'posterPrintFailed')}</div>}
      <h2 class="dc-field-label dc-poster-preview-label">{translator.t('posterPreview')}</h2>
      <div class="dc-poster-frame">
        <article class="dc-poster" data-poster lang={translator.locale === 'ja-JP' ? 'ja' : 'en'}>
          <header class="dc-poster-head">
            <PosterMark />
            <div>
              <div class="dc-poster-kind">{phrased(translator, 'posterAppKind')}</div>
              <div class="dc-poster-brand">Dance Count</div>
            </div>
          </header>
          {name && <div class="dc-poster-school" data-poster-school>{name}</div>}
          <p class="dc-poster-lead">{phrased(translator, 'posterLead')}</p>
          <div class="dc-poster-qr">
            <span class="dc-poster-qr-code" data-poster-qr dangerouslySetInnerHTML={{ __html: qr }} />
            <span class="dc-poster-address" data-poster-address>{address}</span>
          </div>
          <h2 class="dc-poster-steps-head">{translator.t('posterStepsHeading')}</h2>
          <ol class="dc-poster-steps">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <span class="dc-poster-step-no" aria-hidden="true">{index + 1}</span>
                <span class="dc-poster-step-text"><b>{translator.t(step.title)}</b><span>{phrased(translator, step.body)}</span></span>
              </li>
            ))}
          </ol>
          <footer class="dc-poster-foot" data-fineprint>{translator.t('posterQrTrademark')}</footer>
        </article>
      </div>
      <div class="dc-dock">
        <button type="button" class="dc-button dc-primary dc-dock-button" data-poster-print onClick={print}>
          <Icon name="printer" /><span>{translator.t('posterPrint')}</span>
        </button>
      </div>
    </main>
  );
}
