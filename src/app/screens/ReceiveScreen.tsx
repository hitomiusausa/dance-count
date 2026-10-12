import { useEffect, useRef, useState } from 'preact/hooks';
import { BackButton } from '../components/BackButton.tsx';
import { Icon } from '../components/Icon.tsx';
import { LabeledText } from '../components/LabeledText.tsx';
import type { AppTranslator } from '../i18n/index.ts';
import { BundleTooLargeError, INBOX_TOO_LARGE, readBundleText, takeInboxFile } from '../platform/files.ts';
import { externalBrowserUrl, isLineInAppBrowser } from '../platform/page.ts';
import { checkForUpdateThenReload } from '../platform/pwa.ts';
import { requestPersistentStorage } from '../platform/storage.ts';
import { makeId } from '../routines/ids.ts';
import { ROUTINES_MAX } from '../routines/limits.ts';
import { parseBundle } from '../share/bundle.ts';
import { RECEIVED_FILE_FALLBACK, cleanReceivedFileName } from '../share/filename.ts';
import { BUNDLE_ACCEPT } from '../share/limits.ts';
import { commitImport, planImport, type ImportPlan } from '../share/plan-import.ts';
import { useI18n } from '../state/i18n.ts';
import { replaceRoute } from '../state/route.ts';
import { useRoutines } from '../state/routines.ts';
import { useSettings } from '../state/settings.ts';
import { useStorage } from '../state/storage.ts';
import { chooseVoice, packSelection } from '../voices/selection.ts';
import { VOICE_LIMITS, deleteVoicePack, listVoicePacks, packProgress, saveVoicePack, type VoicePackRecord } from '../voices/store.ts';

// S10 受け取る（仕様 §4 S10・Ruling 83）。集中画面。選ぶ → 確認 → 受け取った の 3 つ。生徒の操作は「ファイルを選ぶ → 使う → ホームへ」の 3 タップ。
// 枠（[data-alert]）は選ぶ画面に 1 つだけ（読めない・大きすぎ・新しすぎ・声が 20・LINE の中）。確認の画面の枠は「保存できませんでした」だけ。
// 同じ先生の声・同じルーティンは「使う」で置き換える（D38）。受け取った声はその場で選ばれる（Ruling 83-3）。
// Android の共有（段7の Service Worker）から来た時は受け口（inbox）のファイルで「確認」から始まる（Ruling 79-2）。
type Step = 'pick' | 'confirm' | 'done';
type PickAlert = { kind: 'broken'; file: string } | { kind: 'too-large' | 'too-new' | 'voice-limit' } | null;
const NAMES_SHOWN = 2;   // 確認の画面で名前を並べる本数（3 本目からは「ほか N 本」）

export function ReceiveScreen() {
  const { translator } = useI18n();
  const { update } = useSettings();
  const routinesValue = useRoutines();
  const storage = useStorage();
  const [step, setStep] = useState<Step>('pick');
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<PickAlert>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const latestRoutines = useRef(routinesValue);
  latestRoutines.current = routinesValue;
  const alive = useRef(true);
  const inLine = isLineInAppBrowser();

  // 選んだ・届いたファイルを読む（20MB を超えたら読まない）→ 形を確かめる → 受け取る計画（ID の付け直し・置き換え・上限）。
  // 画面に出すファイル名は制御文字・向きを変える見えない文字を除いた物（選んだファイルの名前は端末任せ。受け口は files.ts で除き済み）。
  const take = async (file: File) => {
    const fileName = cleanReceivedFileName(file.name, RECEIVED_FILE_FALLBACK);
    setBusy(true);
    setAlert(null);
    try {
      const parsed = parseBundle(await readBundleText(file));
      if (!alive.current) return;
      if (!parsed.ok) { setAlert(parsed.problem === 'too-new' ? { kind: 'too-new' } : { kind: 'broken', file: fileName }); return; }
      const packs = await listVoicePacks(storage);
      if (!alive.current) return;
      const next = planImport(parsed, packs, latestRoutines.current.routines, { now: new Date().toISOString(), newId: makeId });
      if (next.voiceBlocked) { setAlert({ kind: 'voice-limit' }); return; }
      setPlan(next);
      setSaveFailed(false);
      setStep('confirm');
    } catch (error) {
      if (alive.current) setAlert(error instanceof BundleTooLargeError ? { kind: 'too-large' } : { kind: 'broken', file: fileName });
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  useEffect(() => {
    // 大きすぎて受け口に入らなかった共有は、選んだ時と同じ「大きすぎ」の枠を選ぶ画面に出す（段7 レビュー M1）
    void takeInboxFile().then(file => {
      if (!file || !alive.current) return;
      if (file === INBOX_TOO_LARGE) setAlert({ kind: 'too-large' });
      else void take(file);
    });
    return () => { alive.current = false; };
  }, []);

  // 「ファイルを選ぶ」: 隠した <input type=file> を同じタップの中で開く。同じファイルを続けて選べるように値は毎回空にする（Ruling 83-5）。
  const choose = () => { if (!busy) input.current?.click(); };
  const picked = (element: HTMLInputElement) => {
    const file = element.files?.[0];
    element.value = '';
    if (file) void take(file);
  };

  // 「使う」: 新しい物を書けてから古い物を消す。声は書けたその場で選ぶ（S7 で選び直させない）。投げた時も「保存できませんでした」（M3）。
  const use = () => {
    if (!plan || busy) return;
    setBusy(true);
    const writer = {
      saveVoice: (pack: VoicePackRecord) => saveVoicePack(storage, pack),
      voiceSaved: (pack: VoicePackRecord) => update(chooseVoice(packSelection(pack))),
      deleteVoice: (id: string) => deleteVoicePack(storage, id),
      saveRoutine: latestRoutines.current.save,
      removeRoutine: latestRoutines.current.remove
    };
    void commitImport(plan, writer).catch(() => false).then(ok => {
      if (!alive.current) return;
      setBusy(false);
      if (!ok) { setSaveFailed(true); return; }
      void requestPersistentStorage();   // 受け取った声・ルーティンを端末が勝手に消さないよう頼む（段7・Ruling 94-1）
      setStep('done');
    });
  };

  const header = (
    <header class="dc-focus-head"><BackButton screen="S10" /><span class="dc-focus-title">{translator.t('receiveTitle')}</span></header>
  );

  if (step === 'done' && plan) {
    const voice = plan.voice?.pack;
    return (
      <main class="dc-screen dc-screen--focus dc-screen--dock dc-receive" data-screen="S10" data-step="done">
        {header}
        <h1 class="dc-heading">{translator.t('receivedTitle')}</h1>
        <p class="dc-body">
          {voice ? voiceNext(translator, voice) : translator.t('receivedRoutines')}
        </p>
        <div class="dc-dock">
          <button type="button" class="dc-button dc-primary dc-dock-button"
            onClick={() => replaceRoute({ screen: voice ? 'S1' : 'S3', params: {} })}>
            <span>{translator.t(voice ? 'goHome' : 'seeRoutines')}</span><Icon name="chev-r" />
          </button>
        </div>
      </main>
    );
  }

  if (step === 'confirm' && plan) {
    const voice = plan.voice;
    const names = plan.routines.map(item => item.routine.name);
    const replacesRoutines = plan.routines.some(item => item.replaces);
    return (
      <main class="dc-screen dc-screen--focus dc-screen--dock dc-receive" data-screen="S10" data-step="confirm">
        {header}
        <h1 class="dc-heading">{translator.t('inThisFile')}</h1>
        {saveFailed && (
          <div class="dc-alert" role="status" data-alert="save-failed">
            <div class="dc-alert-text dc-alert-text--solo"><b>{translator.t('saveFailed')}</b></div>
          </div>
        )}
        <div class="dc-receive-list" data-body>
          {voice && <div class="dc-receive-item"><Icon name="voice" /><span>{voiceLine(translator, voice.pack, plan.distributor)}</span></div>}
          {names.length > 0 && <div class="dc-receive-item"><Icon name="list" /><span>{routinesLine(translator, names)}</span></div>}
          {plan.rejected.slice(0, NAMES_SHOWN).map((item, index) => (
            <div key={index} class="dc-receive-note">{translator.t('routineUnreadable', { name: item.name ?? translator.t('routineNoName') })}</div>
          ))}
          {plan.rejected.length > NAMES_SHOWN && <div class="dc-receive-note">{translator.t('routinesUnreadableMore', { count: plan.rejected.length - NAMES_SHOWN })}</div>}
          {voice?.replaces && <div class="dc-receive-note">{replaceLine(translator, voice.pack, plan.distributor)}</div>}
          {replacesRoutines && <div class="dc-receive-note">{translator.t('replaceRoutines')}</div>}
          {plan.routinesOverLimit > 0 && <div class="dc-receive-note">{translator.t('routinesOverLimit', { max: ROUTINES_MAX, count: plan.routinesOverLimit })}</div>}
        </div>
        <div class="dc-dock dc-receive-dock">
          <button type="button" class="dc-button dc-button--secondary" disabled={busy} onClick={() => { setPlan(null); setStep('pick'); }}>
            <span>{translator.t('cancel')}</span>
          </button>
          <button type="button" class="dc-button dc-primary" disabled={busy} onClick={use}>
            <Icon name="check" /><span>{translator.t('useFile')}</span>
          </button>
        </div>
      </main>
    );
  }

  const lineUrl = inLine ? externalBrowserUrl() : null;
  return (
    <main class="dc-screen dc-screen--focus dc-receive" data-screen="S10" data-step="pick">
      {header}
      {alert ? <PickNotice alert={alert} /> : inLine && (
        <div class="dc-alert" role="status" data-alert="in-line">
          <div class="dc-alert-text">{translator.t('openedInLine')}</div>
          {lineUrl && <a class="dc-alert-action" data-alert-action href={lineUrl}><span>{translator.t('openInSafari')}</span><Icon name="chev-r" /></a>}
        </div>
      )}
      <input ref={input} type="file" accept={BUNDLE_ACCEPT} hidden onChange={event => picked(event.currentTarget as HTMLInputElement)} />
      <button type="button" class="dc-button dc-primary dc-wide dc-receive-choose" disabled={busy} onClick={choose}>
        <span>{translator.t(busy ? 'readingFile' : 'chooseFile')}</span>
      </button>
      <div class="dc-receive-help" data-body>
        {/* iOS の画面の語（「"ファイル"に保存」「最近使った項目」）は WebKit でも途中で折らない（段7 Task 12・S12 と同じ型） */}
        <div><LabeledText text={translator.t('receiveHelpLine')} /></div>
        <div><LabeledText text={translator.t('receiveHelpRecents')} /></div>
      </div>
    </main>
  );
}

function PickNotice({ alert }: { alert: NonNullable<PickAlert> }) {
  const { translator } = useI18n();
  const text = alert.kind === 'broken' ? translator.t('fileBroken', { file: alert.file })
    : alert.kind === 'too-large' ? translator.t('fileTooLarge')
    : alert.kind === 'too-new' ? translator.t('fileTooNew')
    : translator.t('voiceLimitReached', { count: VOICE_LIMITS.packs });
  return (
    <div class="dc-alert" role="status" data-alert={alert.kind}>
      <div class={`dc-alert-text${alert.kind === 'too-new' ? '' : ' dc-alert-text--solo'}`}><b>{text}</b></div>
      {alert.kind === 'too-new' && <button type="button" class="dc-alert-action" data-alert-action onClick={() => void checkForUpdateThenReload()}>{translator.t('updateApp')}</button>}
    </div>
  );
}

function languageName(translator: AppTranslator, pack: VoicePackRecord): string {
  return translator.t(pack.locale === 'ja-JP' ? 'languageJapanese' : 'languageEnglish');
}

// 「山田さんの声（日本語）· 12 語」。旧画面の単体パック（名前の無いファイル）は声の名前のまま。
function voiceLine(translator: AppTranslator, pack: VoicePackRecord, distributor: { name: string } | null): string {
  const values = { language: languageName(translator, pack), count: packProgress(pack).recorded };
  return distributor ? translator.t('fileVoiceFrom', { name: distributor.name, ...values }) : translator.t('fileVoiceNamed', { name: pack.name, ...values });
}

function replaceLine(translator: AppTranslator, pack: VoicePackRecord, distributor: { name: string } | null): string {
  return distributor ? translator.t('replaceVoiceFrom', { name: distributor.name }) : translator.t('replaceVoiceNamed', { name: pack.name });
}

function voiceNext(translator: AppTranslator, pack: VoicePackRecord): string {
  return pack.distributor ? translator.t('receivedVoiceFrom', { name: pack.distributor.name }) : translator.t('receivedVoiceNamed', { name: pack.name });
}

// 「ルーティン 2 本: ワルツのルーティン、タンゴ前のワルツ」。3 本目からは「ほか N 本」。
function routinesLine(translator: AppTranslator, names: string[]): string {
  const separator = translator.locale === 'ja-JP' ? '、' : ', ';
  const shown = names.slice(0, NAMES_SHOWN).join(separator);
  const list = names.length > NAMES_SHOWN ? translator.t('namesAndMore', { names: shown, count: names.length - NAMES_SHOWN }) : shown;
  return names.length === 1 ? translator.t('fileRoutinesOne', { names: list }) : translator.t('fileRoutines', { count: names.length, names: list });
}
