import { Fragment } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { PUBLIC_APP_URL } from '../app-url.ts';
import { BackButton } from '../components/BackButton.tsx';
import { Icon } from '../components/Icon.tsx';
import { danceName } from '../i18n/index.ts';
import { canShareFile, copyText, downloadFile, shareFile } from '../platform/files.ts';
import { routinePlayability, type Routine } from '../routines/routine.ts';
import { buildBundle, cleanDistributorName, exportVoiceForBundle, type ExportedVoice } from '../share/bundle.ts';
import { bundleFileName } from '../share/filename.ts';
import { shareSectionOrder, showChooseNote } from '../share/layout.ts';
import { studentInstructions } from '../share/instructions.ts';
import { BUNDLE_MIME, BUNDLE_ROUTINES_MAX, DISTRIBUTOR_NAME_MAX } from '../share/limits.ts';
import { useI18n } from '../state/i18n.ts';
import { useRoutines } from '../state/routines.ts';
import { useSettings } from '../state/settings.ts';
import { takeShareIntent } from '../state/share-intent.ts';
import { useStorage } from '../state/storage.ts';
import { packDisplayName } from '../voices/selection.ts';
import { isCompletePack, listVoicePacks, type VoicePackRecord } from '../voices/store.ts';

// S9 配る（仕様 §4 S9・Ruling 82）。集中画面。上から 名前 → 声（入れない／録音した完成の声）→ 同意（声を選んだ時だけ）→ ルーティン → 下固定「ファイルを作る」。
// 声の指定なしで来た時（S6・S3 から）は 名前 → ルーティン → 声 → 同意（段5 Task 10b・share/layout.ts）。
// 押せない理由はボタンの近くに 1 行（依頼形にしない）。ファイルはタップの前に作っておき、タップでは共有を同期に呼ぶ（F22・Ruling 81-2）。
// 作った後は上に結果の 1 行と「生徒への案内文をコピー」（初期表示の 5 を超えないため・「ファイル → 案内」の順。Ruling 82-4・82-5）。
// 受け取った声は配れない（D37）。鳴らさない（Ruling 82-8）。
type Result = { kind: 'sent' | 'saved' | 'refused'; file: File; hasVoice: boolean };

export function ShareScreen() {
  const { translator } = useI18n();
  const { settings, update } = useSettings();
  const { routines } = useRoutines();
  const storage = useStorage();
  const locale = translator.locale;
  const [intent] = useState(() => takeShareIntent());
  const [voices, setVoices] = useState<VoicePackRecord[] | null>(null);
  const [name, setName] = useState(settings.distributorName);
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [chosen, setChosen] = useState<string[]>(() => (intent?.routineId ? [intent.routineId] : []));
  const [exported, setExported] = useState<{ id: string; voice: ExportedVoice } | null>(null);
  const [prepFailed, setPrepFailed] = useState(false);   // 声をファイルの形にできなかった（声の 2 択の下に 1 行。段5 Task 10b）
  const [result, setResult] = useState<Result | null>(null);
  const [copy, setCopy] = useState<'idle' | 'copied' | 'manual'>('idle');
  const resultRef = useRef<HTMLDivElement>(null);

  // 配れる声＝録音した完成の声（最大 2）。S7・S8 から来た時はその声を選んだ状態で始める（同意はまだ）。
  useEffect(() => {
    let alive = true;
    void listVoicePacks(storage).then(list => {
      if (!alive) return;
      const recorded = list.filter(pack => pack.origin === 'recorded' && isCompletePack(pack));
      setVoices(recorded);
      if (intent?.voiceId && recorded.some(pack => pack.id === intent.voiceId)) setVoiceId(intent.voiceId);
    });
    return () => { alive = false; };
  }, [storage]);

  // 声は選んだ時に 1 回だけファイルの形にする（12 語 ≒ 1MB の base64・数十 ms）。できるまで主ボタンは押せない。
  useEffect(() => {
    let alive = true;
    const pack = voiceId ? voices?.find(item => item.id === voiceId) : undefined;
    if (!pack) { setExported(null); return; }
    void exportVoiceForBundle(pack).then(voice => { if (alive) setExported({ id: pack.id, voice }); }, () => {
      if (!alive) return;
      setVoiceId(null);
      setConsent(false);
      setPrepFailed(true);
    });
    return () => { alive = false; };
  }, [voiceId, voices]);

  useEffect(() => { if (result) resultRef.current?.scrollIntoView({ block: 'nearest' }); }, [result]);

  const shareable = routines.filter(routine => routinePlayability(routine) === 'ok');
  const chosenRoutines = shareable.filter(routine => chosen.includes(routine.id));
  const cleanName = cleanDistributorName(name);
  const voice = voiceId !== null && exported?.id === voiceId ? exported.voice : null;
  const needsName = !cleanName;
  const needsConsent = voiceId !== null && !consent;
  const needsSomething = voiceId === null && chosenRoutines.length === 0;
  const ready = !needsName && !needsConsent && !needsSomething && (voiceId === null || voice !== null);
  const chosenKey = chosenRoutines.map(routine => `${routine.id}:${routine.updatedAt}`).join(',');

  // 選択・名前・同意が変わるたびにファイルを作り直す（タップの中で作らない＝共有をタップの最初の文で呼べる。Ruling 81-2）。
  const file = useMemo(() => {
    if (!ready) return null;
    const now = new Date();
    const text = buildBundle({ distributorName: cleanName, voice, routines: chosenRoutines, now: now.toISOString() });
    return new File([text], bundleFileName({ locale, distributorName: cleanName, hasVoice: voice !== null, now }), { type: BUNDLE_MIME });
  }, [ready, cleanName, voice, chosenKey, locale]);

  const show = (kind: Result['kind'], made: File, hasVoice: boolean) => {
    setResult({ kind, file: made, hasVoice });
    setCopy('idle');
  };

  const create = () => {
    if (!file) return;
    const made = file;
    const hasVoice = voice !== null;
    if (canShareFile(made)) {
      void shareFile(made).then(outcome => {
        // 拒まれた（Chrome が種類で拒む等。F19）: 自動では保存しない（タップの外では成否が分からず、「保存しました」が嘘になり得る。
        // Fable の答え 2）。「共有できませんでした」と「ファイルを保存する」を出し、次のタップの中で同期に保存する。
        show(outcome === 'refused' ? 'refused' : 'sent', made, hasVoice);
      });
      return;
    }
    downloadFile(made);
    show('saved', made, hasVoice);
  };

  // 拒まれた後の「ファイルを保存する」: タップの中で同期に保存し、1 行を「保存しました」に替える（ボタンは消える。Fable の答え 2）。
  // 保存するのは拒まれたそのファイル（その後に選択を変えていても、画面の 1 行が指すファイルと一致させる）。
  const saveRefused = () => {
    if (!result || result.kind !== 'refused') return;
    downloadFile(result.file);
    setResult({ ...result, kind: 'saved' });
  };

  const instructions = result ? studentInstructions(translator, { hasVoice: result.hasVoice, appUrl: PUBLIC_APP_URL }) : '';
  const copyInstructions = () => { void copyText(instructions).then(ok => setCopy(ok ? 'copied' : 'manual')); };

  const saveName = (input: HTMLInputElement) => {
    const next = cleanDistributorName(input.value);
    input.value = next;
    setName(next);
    if (next !== settings.distributorName) update({ distributorName: next });
  };

  const toggleRoutine = (routine: Routine) => {
    setChosen(current => (current.includes(routine.id) ? current.filter(id => id !== routine.id) : [...current, routine.id]));
  };

  if (voices === null) return <main class="dc-screen dc-screen--focus" data-screen="S9" data-loading><BackButton screen="S9" /></main>;

  const atLimit = chosenRoutines.length >= BUNDLE_ROUTINES_MAX;
  const voiceSection = (
    <>
      <h2 class="dc-field-label dc-share-heading" id="dc-s9-voice">{translator.t('shareVoiceHeading')}</h2>
      {voices.length === 0
        ? <p class="dc-share-empty">{translator.t('shareNoRecordedVoice')}</p>
        : (
          <div class="dc-radiogroup" role="radiogroup" aria-labelledby="dc-s9-voice" data-group="share-voice">
            {[null, ...voices].map(pack => {
              const checked = (pack?.id ?? null) === voiceId;
              return (
                <button key={pack?.id ?? 'none'} type="button" class="dc-radio-row" role="radio" aria-checked={checked ? 'true' : 'false'}
                  onClick={() => { setPrepFailed(false); setVoiceId(pack?.id ?? null); if (!pack) setConsent(false); }}>
                  {checked ? <Icon name="check" /> : <span class="dc-ic" aria-hidden="true" />}
                  <span class="dc-voice-name">{pack ? packDisplayName(translator, pack) : translator.t('shareVoiceNone')}</span>
                </button>
              );
            })}
          </div>
        )}
      {prepFailed && <div class="dc-hint" role="status">{translator.t('shareVoicePrepFailed')}</div>}
      {voiceId !== null && (
        // 同意の文は 2 文と長いので、ボタン（四角）の外に置き、文を押しても切り替わる（ボタン文言は 2 行まで・U10）。
        <div class="dc-consent" data-group="consent">
          <div class="dc-consent-row">
            <button type="button" class="dc-consent-box" role="checkbox" aria-checked={consent ? 'true' : 'false'} aria-labelledby="dc-s9-consent"
              onClick={() => setConsent(!consent)}>
              <span class="dc-checkbox" aria-hidden="true">{consent && <Icon name="check" />}</span>
            </button>
            <div class="dc-consent-text" id="dc-s9-consent" onClick={() => setConsent(!consent)}>{translator.t('shareConsent')}</div>
          </div>
          {needsConsent && <div class="dc-hint">{translator.t('shareConsentNeeded')}</div>}
        </div>
      )}
    </>
  );
  const routineSection = (
    <>
      <h2 class="dc-field-label dc-share-heading" id="dc-s9-routines">{translator.t('shareRoutinesHeading')}</h2>
      {shareable.length === 0
        ? <p class="dc-share-empty">{translator.t('shareNoRoutines')}</p>
        : (
          <div class="dc-share-list" role="list" aria-labelledby="dc-s9-routines" data-list>
            {shareable.map(routine => {
              const checked = chosen.includes(routine.id);
              const dance = danceName(routine.danceId, locale);
              const count = routine.figures.length;
              return (
                <div key={routine.id} role="listitem">
                  <button type="button" class="dc-check-row dc-share-routine" role="checkbox" aria-checked={checked ? 'true' : 'false'}
                    disabled={!checked && atLimit} onClick={() => toggleRoutine(routine)}>
                    <span class="dc-checkbox" aria-hidden="true">{checked && <Icon name="check" />}</span>
                    <span class="dc-row-text">
                      <b>{routine.name}</b>
                      <small>{count === 1 ? translator.t('routineSummaryOne', { dance }) : translator.t('routineSummary', { dance, count })}</small>
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
    </>
  );
  return (
    <main class="dc-screen dc-screen--focus dc-screen--dock dc-share" data-screen="S9" data-result={result ? result.kind : undefined}>
      <header class="dc-focus-head"><BackButton screen="S9" /><span class="dc-focus-title">{translator.t('shareTitle')}</span></header>
      {result && (
        <div class="dc-share-done" ref={resultRef}>
          <div class="dc-result" role="status">
            <div>{result.kind === 'sent' ? translator.t('shareAfterSend')
              : result.kind === 'refused' ? translator.t('shareRefused')
              : translator.t('shareSaved', { file: result.file.name })}</div>
            {copy === 'copied' && <div class="dc-result-sub">{translator.t('instructionsCopied')}</div>}
          </div>
          {result.kind === 'refused' && (
            <button type="button" class="dc-button dc-button--secondary dc-wide" onClick={saveRefused}>
              <span>{translator.t('saveFileAgain')}</span>
            </button>
          )}
          <button type="button" class="dc-button dc-button--secondary dc-wide" onClick={copyInstructions}>
            <Icon name="copy" /><span>{translator.t('copyInstructions')}</span>
          </button>
          {copy === 'manual' && (
            <div class="dc-field">
              <textarea class="dc-input dc-instructions" readOnly rows={8} value={instructions} aria-label={translator.t('instructionsLabel')} />
              <div class="dc-hint">{translator.t('instructionsCopyByHand')}</div>
            </div>
          )}
        </div>
      )}
      <div class="dc-field" data-group="distributor">
        <div class="dc-field-label" id="dc-s9-name-label">{translator.t('shareYourName')}</div>
        <input class="dc-input" type="text" maxLength={DISTRIBUTOR_NAME_MAX} value={name} enterKeyHint="done" autoComplete="name" aria-labelledby="dc-s9-name-label"
          onInput={event => setName((event.currentTarget as HTMLInputElement).value)}
          onBlur={event => saveName(event.currentTarget as HTMLInputElement)}
          onKeyDown={event => { if (event.key === 'Enter') (event.currentTarget as HTMLInputElement).blur(); }} />
        {needsName && <div class="dc-hint">{translator.t('shareNameNeeded')}</div>}
      </div>
      {shareSectionOrder(intent).map(section => <Fragment key={section}>{section === 'voice' ? voiceSection : routineSection}</Fragment>)}
      <div class="dc-dock dc-share-dock">
        {showChooseNote({ needsSomething, voiceCount: voices.length, routineCount: shareable.length }) && <div class="dc-dock-note">{translator.t('shareChooseSomething')}</div>}
        <button type="button" class="dc-button dc-primary dc-dock-button" disabled={!file} onClick={create}>
          <Icon name="share" /><span>{translator.t('createFile')}</span>
        </button>
      </div>
    </main>
  );
}
