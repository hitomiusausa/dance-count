import { useMemo, useState } from 'preact/hooks';
import { BackButton } from '../components/BackButton.tsx';
import { Icon } from '../components/Icon.tsx';
import type { IconName } from '../components/icon-names.ts';
import type { MessageKey } from '../i18n/index.ts';
import { installGuideFor } from '../lib/install-card.ts';
import { copyText } from '../platform/files.ts';
import { currentAddress } from '../platform/page.ts';
import { isStandalone, platformKind, showInstallPrompt, useInstallPromptAvailable } from '../platform/pwa.ts';
import { useI18n } from '../state/i18n.ts';

// iOS 26.3 の Safari（iPhone SE）で実際に辿った手順（F33・Ruling 92-2・D41）。行頭のアイコンは iOS の実物と同じ形（…・共有・⊞）。
const IOS_STEPS: Array<{ icon: IconName | null; key: MessageKey }> = [
  { icon: 'more', key: 'installIosStep1' },
  { icon: 'share', key: 'installIosStep2' },
  { icon: 'plus-square', key: 'installIosStep3' },
  { icon: null, key: 'installIosStep4' }
];
// Android の Chrome（beforeinstallprompt が無い時）。文言は推測（Android の実機が無い。実機確認表 15）。
const ANDROID_STEPS: MessageKey[] = ['installAndroidStep1', 'installAndroidStep2', 'installAndroidStep3'];

// S12 ホーム画面に追加する方法（一覧・親 S6。段7・Ruling 92）。開いた時に端末を 1 回だけ見て、その端末の 1 通りだけを出す。
export function InstallHelpScreen() {
  const { translator } = useI18n();
  const guide = useMemo(() => installGuideFor(platformKind(), isStandalone()), []);
  const promptAvailable = useInstallPromptAvailable();
  const [copy, setCopy] = useState<'idle' | 'copied' | 'manual'>('idle');
  const address = useMemo(() => currentAddress(), []);
  // writeText はタップの中で最初に呼ぶ（Safari）。できなければ長押しで選べる欄（S9 と同じ型）。
  const copyAddress = () => { void copyText(address).then(ok => setCopy(ok ? 'copied' : 'manual')); };

  const copyBlock = (
    <>
      <button type="button" class="dc-button dc-button--secondary dc-wide" onClick={copyAddress}>
        <Icon name="copy" /><span>{translator.t('installCopyAddress')}</span>
      </button>
      {/* コピーの後に何をするかを 1 行で（Fable 答え 5）: iPhone の他のブラウザ→Safari に貼る・PC→スマホに送る */}
      {copy === 'copied' && <div class="dc-hint" role="status">{translator.t(guide === 'desktop' ? 'installAddressCopiedPhone' : 'installAddressCopiedSafari')}</div>}
      {copy === 'manual' && (
        <>
          <input class="dc-input dc-install-address" readOnly value={address} aria-label={translator.t('installCopyAddress')} />
          <div class="dc-hint">{translator.t('instructionsCopyByHand')}</div>
        </>
      )}
    </>
  );

  return (
    <main class="dc-screen dc-install" data-screen="S12" data-guide={guide}>
      <BackButton screen="S12" />
      <h1 class="dc-heading">{translator.t('installTitle')}</h1>
      {guide === 'done' ? <p class="dc-body" data-body>{translator.t('installDone')}</p> : (
        <>
          <p class="dc-body" data-body>{translator.t('installIntro')}</p>
          {guide === 'ios-safari' && (
            <>
              <ol class="dc-steps dc-install-steps">
                {IOS_STEPS.map(step => (
                  <li key={step.key}>
                    <span class="dc-install-step">{step.icon ? <Icon name={step.icon} /> : <span class="dc-ic" aria-hidden="true" />}<span>{translator.t(step.key)}</span></span>
                  </li>
                ))}
              </ol>
              <div class="dc-hint dc-install-note">{translator.t('installNotCarried')}</div>
            </>
          )}
          {guide === 'ios-other' && <><p class="dc-body" data-body>{translator.t('installOpenInSafari')}</p>{copyBlock}</>}
          {guide === 'desktop' && <><p class="dc-body" data-body>{translator.t('installOnPhone')}</p>{copyBlock}</>}
          {guide === 'android' && (promptAvailable
            ? <button type="button" class="dc-button dc-primary dc-wide" onClick={() => { void showInstallPrompt(); }}>
                <Icon name="plus-square" /><span>{translator.t('installAndroidButton')}</span>
              </button>
            : <ol class="dc-steps">{ANDROID_STEPS.map(key => <li key={key}>{translator.t(key)}</li>)}</ol>)}
        </>
      )}
    </main>
  );
}
