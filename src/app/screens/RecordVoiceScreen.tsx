import { useEffect, useRef, useState } from 'preact/hooks';
import { BackButton } from '../components/BackButton.tsx';
import { Icon } from '../components/Icon.tsx';
import { playBuffer, unlockAudioInsideTap } from '../platform/audio-context.ts';
import { RecorderError, TAKE_MS, recordTake, recorderSupported, requestMicrophone } from '../platform/recorder.ts';
import { requestPersistentStorage } from '../platform/storage.ts';
import { usePracticeSession } from '../practice/use-session.ts';
import type { UiState } from '../router/routes.ts';
import { useI18n } from '../state/i18n.ts';
import { takeRecordLanguage } from '../state/record-language.ts';
import { replaceRoute } from '../state/route.ts';
import { useSettings } from '../state/settings.ts';
import { useStorage } from '../state/storage.ts';
import { recordedPackIdFor, type VoiceLocale } from '../voices/ids.ts';
import { processTake, type DecodeContext } from '../voices/normalize.ts';
import { voicePreviewOptions } from '../voices/preview.ts';
import { DEFAULT_VOICE, chooseVoice, packSelection } from '../voices/selection.ts';
import { VOICE_KEYS, loadVoicePack, newRecordedPack, packProgress, renamePack, saveVoicePack, withWord, type VoicePackRecord } from '../voices/store.ts';
import { WAVE_BARS, wavPeaks } from '../voices/wave.ts';
import { defaultVoiceName, nextStep, previousStep, stepAfterStart, wordPrompts, type RecordStep } from '../voices/wizard.ts';

// S8 自分の声を録音（仕様 §4 S8・Ruling 57〜59・D23・D25・D30）。集中画面。0 説明と言葉の 2 択 → 1〜12 の語 → 完成。
// 1 語ごとに端末へ保存（戻る・電話・落ちるのどれでも録った語が残る）。「‹ 戻る」は S8 を出る（確認なし）。
// マイクが使えない（拒否・ほかのアプリや通話が使用中）は別画面にせず、説明の画面の説明 3 行の場所に枠を出す。
// 言葉の 2 択と「録音をはじめる」は残す＝もう一度は同じボタン（D30・Fable Q2/Q4）。
// ui-state: mic-denied（説明の画面に拒否の枠）・no-voice（1 語目に「声が入っていませんでした」）・no-recorder（非対応の枠）。見た目だけ（Ruling 63-3）。
const PROGRESS_TICK_MS = 100;   // 録音中の輪を描き直す間隔（1.5 秒の動きは transition ではなく描画の更新で。U8）
const LANGUAGES: readonly VoiceLocale[] = ['en', 'ja-JP'];

type Alert = 'none' | 'no-voice' | 'save-failed';
type Blocked = 'none' | 'denied' | 'failed' | 'unsupported';

function blockedBy(error: unknown): Blocked {
  if (!(error instanceof RecorderError)) return 'failed';
  return error.kind;
}

export function RecordVoiceScreen({ uiState }: { uiState?: UiState }) {
  const { translator } = useI18n();
  const { update } = useSettings();
  const storage = useStorage();
  const [language, setLanguage] = useState<VoiceLocale>(() => takeRecordLanguage() ?? 'en');
  const [saved, setSaved] = useState<Record<VoiceLocale, VoicePackRecord | null> | null>(null);
  const [pack, setPack] = useState<VoicePackRecord | null>(null);
  const [step, setStep] = useState<RecordStep>(() => (uiState === 'no-voice' ? { kind: 'word', index: 0 } : { kind: 'intro' }));
  const [blocked, setBlocked] = useState<Blocked>(() => (uiState === 'mic-denied' ? 'denied' : uiState === 'no-recorder' || !recorderSupported() ? 'unsupported' : 'none'));
  const [alert, setAlert] = useState<Alert>(uiState === 'no-voice' ? 'no-voice' : 'none');
  const [howTo, setHowTo] = useState(false);
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [listening, setListening] = useState(false);
  const generation = useRef(0);          // 画面を離れた・語を移った後に届いた録音の結果は捨てる（Ruling 57-7）
  const stopListening = useRef<(() => void) | null>(null);
  const abortTake = useRef<AbortController | null>(null);   // 録音中の 1 語をやめる（マイクを閉じ、音声セッションを戻す）
  const persisted = useRef(false);
  const { session, view } = usePracticeSession('S8');
  const [comparing, setComparing] = useState<'mine' | 'standard' | null>(null);
  const comparePlaying = view.playing || view.starting;

  // 両方の言葉の声を読む（説明の画面の「7 / 12 語まで録音済み」のため。Blob は読み終えても描かない）。
  useEffect(() => {
    let alive = true;
    void Promise.all(LANGUAGES.map(locale => loadVoicePack(storage, recordedPackIdFor(locale)))).then(([en, ja]) => {
      if (!alive) return;
      setSaved({ en: en ?? null, 'ja-JP': ja ?? null });
      if (uiState === 'no-voice') setPack(newRecordedPack('en', defaultVoiceName(translator, 'en'), new Date().toISOString()));
    });
    // 画面を離れた: 届く結果を捨て、録音中ならやめて（マイクを閉じ・音声セッションを「再生」に戻す）、「聞く」も止める。
    return () => { alive = false; generation.current += 1; abortTake.current?.abort(); abortTake.current = null; stopListening.current?.(); };
  }, [storage]);

  const word = step.kind === 'word' ? VOICE_KEYS[step.index]! : null;
  const take = word ? pack?.words[word] ?? null : null;
  // 波形は録れた WAV から（AudioContext を使わない）。語を移る・録り直すたびに描き直す。
  useEffect(() => {
    let alive = true;
    setPeaks([]);
    if (take) void take.blob.arrayBuffer().then(bytes => { if (alive) setPeaks(wavPeaks(bytes)); });
    return () => { alive = false; };
  }, [take]);
  useEffect(() => { if (!comparePlaying) setComparing(null); }, [comparePlaying]);

  const leaveWord = () => {
    generation.current += 1;
    abortTake.current?.abort();
    abortTake.current = null;
    stopListening.current?.();
    setRecording(false);
    setProgress(0);
    setAlert('none');   // 枠は語を移ったら消す（Fable Q5）
  };
  const goTo = (next: RecordStep | null) => {
    if (!next) return;
    leaveWord();
    session.stop();
    setStep(next);
  };

  // 「録音をはじめる」: タップの中でマイクの許可を取り、すぐ閉じる（Ruling 8・57-2）。拒否・失敗の後のもう一度も同じボタン（D30）。
  const start = () => {
    requestMicrophone().then(() => {
      const existing = saved?.[language] ?? null;
      setPack(existing ?? newRecordedPack(language, defaultVoiceName(translator, language), new Date().toISOString()));
      setBlocked('none');
      setHowTo(false);
      setStep(stepAfterStart(existing));
    }, (error: unknown) => {
      setBlocked(blockedBy(error));
    });
  };

  // 「録音する」: タップの中で音を解除し（decode に使う）、マイクを開いて 1.5 秒（Ruling 57・58）。
  // 前の枠（声が入っていない等）は結果が出るまで残す（録音中にボタンの位置が動かないように）。成功で消える（Fable Q5）。
  const record = () => {
    if (!pack || !word || recording) return;
    stopListening.current?.();
    let audio: AudioContext | null = null;
    try { audio = unlockAudioInsideTap(); } catch { audio = null; }
    const mine = ++generation.current;
    const controller = new AbortController();
    abortTake.current = controller;
    setRecording(true);
    setProgress(0);
    let timer: ReturnType<typeof setInterval> | null = null;
    const startedAt = { at: 0 };
    recordTake({
      signal: controller.signal,
      onStart: () => {
        startedAt.at = Date.now();
        timer = setInterval(() => setProgress(Math.min(1, (Date.now() - startedAt.at) / TAKE_MS)), PROGRESS_TICK_MS);
      }
    })
      .then(async recorded => {
        if (!audio) return { ok: false as const, problem: 'failed' as const };
        return processTake(audio as unknown as DecodeContext, recorded.blob, word);
      })
      .then(async result => {
        if (mine !== generation.current) return;
        if (!result.ok) { setAlert('no-voice'); return; }   // 前の録音は残す（Ruling 58-2）
        const next = withWord(pack, word, result.word, new Date().toISOString());
        if (!(await saveVoicePack(storage, next))) { if (mine === generation.current) setAlert('save-failed'); return; }
        if (!persisted.current) { persisted.current = true; void requestPersistentStorage(); }
        if (mine !== generation.current) return;
        setAlert('none');
        setPack(next);
        setSaved(current => (current ? { ...current, [next.locale]: next } : current));
      }, (error: unknown) => {
        if (mine !== generation.current) return;
        // マイクの問題（拒否・使用中・非対応）は説明の画面の枠へ。録れた語は保存済みなので「録音をはじめる」で同じ語に戻る。
        if (error instanceof RecorderError) {
          abortTake.current = null;
          setAlert('none');
          setBlocked(error.kind);
          setStep({ kind: 'intro' });
          return;
        }
        setAlert('no-voice');
      })
      .finally(() => {
        if (timer) clearInterval(timer);
        if (abortTake.current === controller) abortTake.current = null;
        if (mine === generation.current) { setRecording(false); setProgress(0); }
      });
  };

  // 「▶ 聞く」: 録れた WAV をそのまま 1 回。鳴っている間にもう一度押すと止める（マイクは閉じている。Ruling 57-4）。
  const listen = () => {
    if (!take) return;
    if (listening) { stopListening.current?.(); return; }
    let audio: AudioContext;
    try { audio = unlockAudioInsideTap(); } catch { return; }
    setListening(true);
    const mine = generation.current;
    void take.blob.arrayBuffer().then(bytes => audio.decodeAudioData(bytes)).then(buffer => {
      if (mine !== generation.current) { setListening(false); return; }
      stopListening.current = playBuffer(audio, buffer, () => { stopListening.current = null; setListening(false); });
    }, () => setListening(false));
  };

  const compare = (which: 'mine' | 'standard') => {
    if (!pack) return;
    if (comparePlaying && comparing === which) { session.stop(); return; }
    setComparing(which);
    void session.play(voicePreviewOptions(which === 'mine' ? packSelection(pack) : DEFAULT_VOICE, 0, 2));
  };

  const rename = (value: string) => {
    if (!pack) return;
    const next = renamePack(pack, value) ?? { ...pack, name: defaultVoiceName(translator, pack.locale) };
    if (next.name === pack.name) return;
    setPack(next);
    void saveVoicePack(storage, next).then(ok => setAlert(ok ? 'none' : 'save-failed'));
  };

  const finish = () => {
    if (!pack) return;
    session.stop();
    update(chooseVoice(packSelection(pack)));
    replaceRoute({ screen: 'S7', params: {} });
  };

  const header = (
    <header class="dc-focus-head"><BackButton screen="S8" /><span class="dc-focus-title">{translator.t('recordTitle')}</span></header>
  );

  if (blocked === 'unsupported') {
    return (
      <main class="dc-screen dc-screen--focus dc-record" data-screen="S8" data-step="unsupported">
        {header}
        <div class="dc-alert" role="status" data-alert="no-recorder"><div class="dc-alert-text dc-alert-text--solo"><b>{translator.t('noRecorder')}</b></div></div>
      </main>
    );
  }

  if (step.kind === 'intro' || !pack) {
    const micProblem = blocked === 'denied' || blocked === 'failed';
    return (
      <main class="dc-screen dc-screen--focus dc-screen--dock dc-record" data-screen="S8" data-step={micProblem ? 'denied' : 'intro'}>
        {header}
        {blocked === 'denied' ? (
          // マイクが使えない設定（Ruling 57-6・D30）: 説明 3 行の場所に枠。「設定の開き方」は同じ枠の中で 3 行に替わる。
          <div class="dc-alert" role="status" data-alert="mic-denied">
            <div class="dc-alert-text"><b>{translator.t('micDenied')}</b></div>
            {howTo
              ? <div class="dc-alert-text dc-howto"><div>{translator.t('micHowToIphone')}</div><div>{translator.t('micHowToOther')}</div><div>{translator.t('micHowToThen')}</div></div>
              : <button type="button" class="dc-alert-action" data-alert-action onClick={() => setHowTo(true)}>{translator.t('micHowTo')}</button>}
          </div>
        ) : blocked === 'failed' ? (
          // マイクが見つからない・ほかのアプリや通話が使用中（Fable Q2）: 設定ではなく、終えてからもう一度。
          <div class="dc-alert" role="status" data-alert="mic-failed">
            <div class="dc-alert-text dc-alert-text--solo"><b>{translator.t('micFailed')}</b></div>
          </div>
        ) : (
          <div class="dc-record-intro" data-body>
            <div>{translator.t('recordIntro1')}</div>
            <div>{translator.t('recordIntro2')}</div>
            <div>{translator.t('recordIntro3')}</div>
          </div>
        )}
        <h2 class="dc-field-label" id="dc-s8-language">{translator.t('recordLanguage')}</h2>
        <div class="dc-radiogroup" role="radiogroup" aria-labelledby="dc-s8-language" data-group="record-language">
          {LANGUAGES.map(locale => {
            const checked = language === locale;
            const progress = packProgress(saved?.[locale] ?? null);
            return (
              <button key={locale} type="button" class="dc-radio-row dc-language-row" role="radio" aria-checked={checked ? 'true' : 'false'}
                onClick={() => setLanguage(locale)}>
                {checked ? <Icon name="check" /> : <span class="dc-ic" aria-hidden="true" />}
                <span class="dc-radio-text">
                  <span>{translator.t(locale === 'ja-JP' ? 'countInJapanese' : 'countInEnglish')}</span>
                  {progress.recorded > 0 && (
                    <small>{progress.complete ? translator.t('recordedAll') : translator.t('recordedUpTo', { count: progress.recorded })}</small>
                  )}
                </span>
              </button>
            );
          })}
        </div>
        <div class="dc-dock">
          <button type="button" class="dc-button dc-primary dc-dock-button" disabled={saved === null} onClick={start}>
            <Icon name="mic" /><span>{translator.t('startRecording')}</span>
          </button>
        </div>
      </main>
    );
  }

  if (step.kind === 'done') {
    return (
      <main class="dc-screen dc-screen--focus dc-screen--dock dc-record" data-screen="S8" data-step="done">
        {header}
        <h1 class="dc-heading">{translator.t('voiceReadyTitle')}</h1>
        <NoticeLine alert={alert} />
        <div class="dc-field">
          <div class="dc-field-label" id="dc-s8-name-label">{translator.t('voiceName')}</div>
          <input id="dc-s8-name" class="dc-input" type="text" maxLength={40} value={pack.name} enterKeyHint="done" aria-labelledby="dc-s8-name-label"
            onBlur={event => rename((event.currentTarget as HTMLInputElement).value)}
            onKeyDown={event => { if (event.key === 'Enter') (event.currentTarget as HTMLInputElement).blur(); }} />
        </div>
        <h2 class="dc-field-label" id="dc-s8-compare">{translator.t('compareTitle')}</h2>
        <div class="dc-compare" role="group" aria-labelledby="dc-s8-compare" data-group="compare">
          {(['mine', 'standard'] as const).map(which => {
            const on = comparePlaying && comparing === which;
            return (
              <button key={which} type="button" class="dc-button dc-button--secondary" aria-pressed={on ? 'true' : 'false'} onClick={() => compare(which)}>
                <Icon name={on ? 'stop' : 'play'} /><span>{translator.t(which === 'mine' ? 'yourVoice' : 'standardVoice')}</span>
              </button>
            );
          })}
        </div>
        <button type="button" class="dc-button dc-button--secondary dc-wide dc-record-again" onClick={() => goTo({ kind: 'word', index: 0 })}>
          <Icon name="mic" /><span>{translator.t('recordAgain')}</span>
        </button>
        <div class="dc-dock">
          <button type="button" class="dc-button dc-primary dc-dock-button" onClick={finish}>
            <Icon name="check" /><span>{translator.t('finishDone')}</span>
          </button>
        </div>
      </main>
    );
  }

  const index = step.index;
  const prompts = wordPrompts(pack.locale, word!);
  const onsetAt = take ? Math.min(1, take.onsetMs / take.durationMs) : 0;
  return (
    <main class="dc-screen dc-screen--focus dc-screen--dock dc-record" data-screen="S8" data-step="word" data-recording={recording ? 'true' : 'false'}>
      {header}
      <div class="dc-record-progress" role="progressbar" aria-valuemin={0} aria-valuemax={VOICE_KEYS.length} aria-valuenow={index + 1}
        aria-label={translator.t('wordProgress', { index: index + 1 })}>
        <div class="dc-record-progress-text" aria-hidden="true"><b>{index + 1}</b> / 12</div>
        <div class="dc-record-cells" aria-hidden="true">
          {VOICE_KEYS.map((key, cell) => (
            <span key={key} class={`dc-record-cell${cell === index ? ' dc-record-cell--now' : pack.words[key] ? ' dc-record-cell--done' : ''}`} />
          ))}
        </div>
      </div>
      <div class="dc-record-word">
        <div class="dc-record-main" lang={pack.locale === 'ja-JP' ? 'ja' : 'en'}>{prompts.main}</div>
        <div class="dc-record-other" lang={pack.locale === 'ja-JP' ? 'en' : 'ja'}>{prompts.other}</div>
      </div>
      {alert !== 'none'
        ? <NoticeLine alert={alert} />
        : <p class="dc-record-hint">{translator.t('recordHint')}</p>}
      <div class="dc-rec-ring" style={{ '--p': String(progress) }}>
        <button type="button" class="dc-rec" disabled={recording} onClick={record}>
          <Icon name="mic" />
          <span>{recording ? translator.t('recordingNow') : take ? translator.t('recordAgain') : translator.t('recordWord')}</span>
        </button>
      </div>
      {take && (
        <div class="dc-take">
          <svg class="dc-wave" viewBox={`0 0 ${WAVE_BARS * 4} 40`} preserveAspectRatio="none" aria-hidden="true">
            {peaks.map((peak, bar) => <rect key={bar} x={bar * 4 + 1} y={20 - Math.max(1, peak * 19)} width="2" height={Math.max(2, peak * 38)} />)}
            <rect class="dc-wave-onset" x={onsetAt * WAVE_BARS * 4} y="0" width="1.5" height="40" />
          </svg>
          <button type="button" class="dc-chip dc-listen" aria-pressed={listening ? 'true' : 'false'} onClick={listen}>
            <Icon name={listening ? 'stop' : 'play'} /><span>{translator.t('listenTake')}</span>
          </button>
        </div>
      )}
      <div class="dc-dock dc-record-dock">
        {index > 0 && (
          <button type="button" class="dc-button dc-button--secondary" onClick={() => goTo(previousStep(index))}>
            <Icon name="chev-l" /><span>{translator.t('previousWord')}</span>
          </button>
        )}
        <button type="button" class="dc-button dc-primary" disabled={recording || !take} onClick={() => goTo(nextStep(pack, index))}>
          <span>{translator.t(index === VOICE_KEYS.length - 1 ? 'finishRecording' : 'nextWord')}</span><Icon name="chev-r" />
        </button>
      </div>
    </main>
  );
}

// 語の画面と完成画面の枠（Ruling 30 の型。中の操作は無い）。
function NoticeLine({ alert }: { alert: Alert }) {
  const { translator } = useI18n();
  if (alert === 'none') return null;
  return (
    <div class="dc-alert" role="status" data-alert={alert}>
      <div class="dc-alert-text dc-alert-text--solo"><b>{translator.t(alert === 'no-voice' ? 'noVoiceHeard' : 'saveFailed')}</b></div>
    </div>
  );
}
