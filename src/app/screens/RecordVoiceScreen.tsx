import { useEffect, useRef, useState } from 'preact/hooks';
import { FocusHeader } from '../components/FocusHeader.tsx';
import { Icon } from '../components/Icon.tsx';
import { phrased } from '../i18n/phrased.tsx';
import { showsRecordInstallHint } from '../lib/install-card.ts';
import { outputLatencySeconds, playBuffer, scheduleTone, unlockAudioInsideTap } from '../platform/audio-context.ts';
import { isStandalone, platformKind } from '../platform/pwa.ts';
import { RecorderError, TAKE_MS, recordTake, recorderNeedsHttps, recorderSupported, requestMicrophone } from '../platform/recorder.ts';
import { requestPersistentStorage } from '../platform/storage.ts';
import { usePracticeSession } from '../practice/use-session.ts';
import type { UiState } from '../router/routes.ts';
import { useI18n } from '../state/i18n.ts';
import { takeRecordLanguage } from '../state/record-language.ts';
import { requestShareIntent } from '../state/share-intent.ts';
import { replaceRoute } from '../state/route.ts';
import { useSettings } from '../state/settings.ts';
import { useStorage } from '../state/storage.ts';
import { recordedPackIdFor, type VoiceLocale } from '../voices/ids.ts';
import { captureWaitMs, countdownPlan, type CountMark } from '../voices/countdown.ts';
import { processTake, type DecodeContext } from '../voices/normalize.ts';
import { voicePreviewOptions } from '../voices/preview.ts';
import { DEFAULT_VOICE, chooseVoice, packSelection } from '../voices/selection.ts';
import { VOICE_KEYS, loadVoicePack, newRecordedPack, packProgress, saveVoicePack, withWord, type VoicePackRecord } from '../voices/store.ts';
import { WAVE_BARS, wavPeaks } from '../voices/wave.ts';
import { defaultRecordLanguage, defaultVoiceName, nameAfterEdit, nextStep, previousStep, savesVoices, stepAfterStart, takeErrorOutcome, uiStateStartPack, wordPrompts, type RecordStep } from '../voices/wizard.ts';

// S8 自分の声を録音（仕様 §4 S8・Ruling 57〜59・D23・D25・D30）。集中画面。0 説明と言葉の 2 択 → 1〜12 の語 → 完成。
// 1 語ごとに端末へ保存（戻る・電話・落ちるのどれでも録った語が残る）。「‹ 戻る」は S8 を出る（確認なし）。
// マイクが使えない（拒否・ほかのアプリや通話が使用中）は別画面にせず、説明の画面の説明 3 行の場所に枠を出す。
// 言葉の 2 択と「録音をはじめる」は残す＝もう一度は同じボタン（D30・Fable Q2/Q4）。
// ui-state: mic-denied（説明の画面に拒否の枠）・no-voice（1 語目に「声が入っていませんでした」）・no-recorder（非対応の枠）。見た目だけ（Ruling 63-3）。
// 段8（Ruling 100-2）: mic-failed（説明の画面に「マイクを使えませんでした」）・save-failed（1 語目に「保存できませんでした」）。
// D59: rec-countdown（1 語目の合図「3」で止まった見た目）・rec-capture（1 語目の「● 録音中」で止まった見た目）。マイクは開かず、音も鳴らさない。
// ui-state の時は録っても名前を変えても端末の声・設定に書かない（画面の中だけ。最終レビュー M5）。no-voice は英語の声があればその写しから。
const PROGRESS_TICK_MS = 100;   // 録音中の棒を描き直す間隔（2 秒の動きは transition ではなく描画の更新で。U8）
const LANGUAGES: readonly VoiceLocale[] = ['en', 'ja-JP'];

type Alert = 'none' | 'no-voice' | 'save-failed';
// 「録音する」の後（D59）: idle → countdown（3・2・1・今。マイクは開いている・録音はまだ）→ capture（録音中）→ idle
type Phase = 'idle' | 'countdown' | 'capture';
type Blocked = 'none' | 'denied' | 'failed' | 'unsupported';

// 段8 Task 9（通し確認）: 数える言葉の行は括弧の前でだけ折る（iOS 26 で「スロー／…）」、Chrome で「に、／スロー…）」と括弧の中で折れた）。
// 括弧の中は 1 かたまり（320 幅でも 1 行に入る長さ）。textContent は変えない（<wbr> は文字を足さない）
function countLabel(label: string) {
  const open = label.search(/（| \(/);
  if (open <= 0) return label;
  const cut = label[open] === ' ' ? open + 1 : open;   // 英語は空白の後で（空白が折れ目）
  return <>{label.slice(0, cut)}<wbr /><span class="dc-nowrap">{label.slice(cut)}</span></>;
}

// 合図（D59）: 3・2・1 の「ピ」と今の「ポーン」を音の時計に予約し、数字を画面に出し、録音を始めてよい時に resolve する。
// 合図の音が録音に入らない仕組み: (1) 録音の開始は表（countdownPlan）の captureAtMs＝ポーンの終わり＋出力の遅れ＋余白 150ms。
// (2) その時に音の時計でもう一度確かめ、まだ鳴り終わっていなければ（時計のずれ）残りを止めて、届き終わるまで待つ（captureWaitMs）。
// (3) AudioContext が動いていない時は音を鳴らさない（数字だけで進む。止まっていた時計が後から鳴らすのを防ぐ）。
// signal（「やめる」・語を移った・画面を離れた）で予約した音を止めて reject。
function runCountdown(audio: AudioContext | null, signal: AbortSignal, onMark: (mark: CountMark) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const sounding = audio !== null && audio.state === 'running';
    const latencyMs = audio && sounding ? outputLatencySeconds(audio) * 1000 : 0;
    const plan = countdownPlan(latencyMs);
    const audioStart = audio && sounding ? audio.currentTime : 0;
    const stops = audio && sounding ? plan.cues.map(cue => scheduleTone(audio, audioStart + cue.atMs / 1000, cue.hz, cue.ms)) : [];
    const timers: ReturnType<typeof setTimeout>[] = [];
    const cleanup = () => { timers.forEach(clearTimeout); signal.removeEventListener('abort', onAbort); };
    function onAbort() { cleanup(); stops.forEach(stop => stop()); reject(new RecorderError('failed')); }
    if (signal.aborted) { onAbort(); return; }
    signal.addEventListener('abort', onAbort);
    for (const { atMs, mark } of plan.marks) timers.push(setTimeout(() => onMark(mark), atMs));
    timers.push(setTimeout(() => {
      const wait = captureWaitMs(plan, audio && sounding ? (audio.currentTime - audioStart) * 1000 : null, latencyMs);
      if (wait > 0) stops.forEach(stop => stop());
      timers.push(setTimeout(() => { cleanup(); resolve(); }, wait));
    }, plan.captureAtMs));
  });
}

function blockedBy(error: unknown): Blocked {
  if (!(error instanceof RecorderError)) return 'failed';
  return error.kind;
}

export function RecordVoiceScreen({ uiState }: { uiState?: UiState }) {
  const { translator } = useI18n();
  const { settings, update } = useSettings();
  // バックアップの 1 行（Ruling 86-2）は、この端末で完成の画面を初めて出した時だけ（出したら hints に書く。閉じるボタンは無い）
  const [backupTip] = useState(() => !settings.hints.backupTipShownForRecording);
  const storage = useStorage();
  // 言葉の既定（夜間便 A-1）: S7 からの印があればすぐそれ。声を読み終えたら defaultRecordLanguage で決め直す（2 択を押した後は上書きしない）
  const [requestedLanguage] = useState(() => takeRecordLanguage());
  const [language, setLanguage] = useState<VoiceLocale>(requestedLanguage ?? 'en');
  const languageTouched = useRef(false);
  const [saved, setSaved] = useState<Record<VoiceLocale, VoicePackRecord | null> | null>(null);
  const [pack, setPack] = useState<VoicePackRecord | null>(null);
  const forcedWord = uiState === 'no-voice' || uiState === 'save-failed' || uiState === 'rec-countdown' || uiState === 'rec-capture';
  const [step, setStep] = useState<RecordStep>(() => (forcedWord ? { kind: 'word', index: 0 } : { kind: 'intro' }));
  const [blocked, setBlocked] = useState<Blocked>(() => (uiState === 'mic-denied' ? 'denied' : uiState === 'mic-failed' ? 'failed' : uiState === 'no-recorder' || uiState === 'no-https' || !recorderSupported() ? 'unsupported' : 'none'));
  const [alert, setAlert] = useState<Alert>(uiState === 'no-voice' ? 'no-voice' : uiState === 'save-failed' ? 'save-failed' : 'none');
  const [howTo, setHowTo] = useState(false);
  const [phase, setPhase] = useState<Phase>(uiState === 'rec-countdown' ? 'countdown' : uiState === 'rec-capture' ? 'capture' : 'idle');
  const [mark, setMark] = useState<CountMark>(3);
  const recording = phase !== 'idle';   // 合図と録音のあいだ（マイクが開いている）
  const [progress, setProgress] = useState(uiState === 'rec-capture' ? 0.4 : 0);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [listening, setListening] = useState(false);
  const generation = useRef(0);          // 画面を離れた・語を移った後に届いた録音の結果は捨てる（Ruling 57-7）
  const stopListening = useRef<(() => void) | null>(null);
  const abortTake = useRef<AbortController | null>(null);   // 録音中の 1 語をやめる（マイクを閉じ、音声セッションを戻す）
  const persisted = useRef(false);
  const persists = savesVoices(uiState);
  const { session, view } = usePracticeSession('S8');
  const [comparing, setComparing] = useState<'mine' | 'standard' | null>(null);
  const comparePlaying = view.playing || view.starting;

  // 両方の言葉の声を読む（説明の画面の「7 / 12 語まで録音済み」のため。Blob は読み終えても描かない）。
  useEffect(() => {
    let alive = true;
    void Promise.all(LANGUAGES.map(locale => loadVoicePack(storage, recordedPackIdFor(locale)))).then(([en, ja]) => {
      if (!alive) return;
      const loaded = { en: en ?? null, 'ja-JP': ja ?? null };
      setSaved(loaded);
      if (!languageTouched.current) setLanguage(defaultRecordLanguage(requestedLanguage, loaded));
      if (forcedWord) setPack(uiStateStartPack(en ?? null, newRecordedPack('en', defaultVoiceName(translator, 'en'), new Date().toISOString())));
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
  const doneShown = step.kind === 'done' && pack !== null;
  useEffect(() => {
    if (doneShown && backupTip && persists) update({ hints: { ...settings.hints, backupTipShownForRecording: true } });
  }, [doneShown]);

  const leaveWord = () => {
    generation.current += 1;
    abortTake.current?.abort();
    abortTake.current = null;
    stopListening.current?.();
    setPhase('idle');
    setProgress(0);
    setAlert('none');   // 枠は語を移ったら消す（Fable Q5）
  };
  // 合図の間の「やめる」（D59）: 何も保存しない・枠もそのまま。届く結果は generation で捨てる。マイクはすぐ閉じる。
  const cancelTake = () => {
    generation.current += 1;
    abortTake.current?.abort();
    abortTake.current = null;
    setPhase('idle');
    setProgress(0);
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

  // 「録音する」: タップの中で音を解除し（合図と decode に使う）、マイクを開いて、合図（3・2・1・今）の後 2 秒（Ruling 57・58・D59）。
  // 合図の間にもう一度押すと「やめる」。前の枠（声が入っていない等）は結果が出るまで残す（録音中にボタンの位置が動かないように）。成功で消える（Fable Q5）。
  const record = () => {
    if (!pack || !word) return;
    if (phase === 'countdown') { cancelTake(); return; }
    if (recording) return;
    stopListening.current?.();
    let audio: AudioContext | null = null;
    try { audio = unlockAudioInsideTap(); } catch { audio = null; }
    const mine = ++generation.current;
    const controller = new AbortController();
    abortTake.current = controller;
    setPhase('countdown');
    setMark(3);
    setProgress(0);
    let timer: ReturnType<typeof setInterval> | null = null;
    const startedAt = { at: 0 };
    recordTake({
      signal: controller.signal,
      prepare: () => runCountdown(audio, controller.signal, next => { if (mine === generation.current) setMark(next); }),
      onStart: () => {
        if (mine === generation.current) setPhase('capture');
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
        if (persists) {
          if (!(await saveVoicePack(storage, next))) { if (mine === generation.current) setAlert('save-failed'); return; }
          if (!persisted.current) { persisted.current = true; void requestPersistentStorage(); }
        }
        if (mine !== generation.current) return;
        setAlert('none');
        setPack(next);
        setSaved(current => (current ? { ...current, [next.locale]: next } : current));
      }, (error: unknown) => {
        if (mine !== generation.current) return;
        // 拒否・非対応だけ説明の画面の枠へ（録れた語は保存済み。「録音をはじめる」で同じ所に戻る）。
        // それ以外（'failed' 等）はその語に留まり「声が入っていませんでした」（Ruling 57-6・58-2。完成済みの声の録り直しでも場所を失わない）。
        const outcome = takeErrorOutcome(error instanceof RecorderError ? error.kind : null);
        if (outcome === 'no-voice') { setAlert('no-voice'); return; }
        abortTake.current = null;
        setAlert('none');
        setBlocked(outcome);
        setStep({ kind: 'intro' });
      })
      .finally(() => {
        if (timer) clearInterval(timer);
        if (abortTake.current === controller) abortTake.current = null;
        if (mine === generation.current) { setPhase('idle'); setProgress(0); }
      });
  };

  // 「▶ 聞く」: 録れた WAV をそのまま 1 回。鳴っている間にもう一度押すと止める（マイクは閉じている。Ruling 57-4）。
  // 録音中は押せない（マイクが開いている間に前の声を鳴らすと、新しい録音に入ってしまう。最終レビュー M2）。
  const listen = () => {
    if (!take || recording) return;
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

  // 空にしたら既定名に戻し、欄にも書き戻す（名前が変わらず描き直されない時も欄が空のまま見えない。最終レビュー M1）。
  const rename = (input: HTMLInputElement) => {
    if (!pack) return;
    const { next, shown } = nameAfterEdit(pack, input.value, defaultVoiceName(translator, pack.locale));
    input.value = shown;
    if (!next) return;
    setPack(next);
    if (persists) void saveVoicePack(storage, next).then(ok => setAlert(ok ? 'none' : 'save-failed'));
  };

  const finish = () => {
    if (!pack) return;
    session.stop();
    if (persists) update(chooseVoice(packSelection(pack)));
    replaceRoute({ screen: 'S7', params: {} });
  };

  // 「配る ›」（Ruling 86-2・D39）: この声を選んでから S9 へ置き換え（S9 の「戻る」は S7）。S9 にはこの声が選ばれた状態で開く。
  const share = () => {
    if (!pack) return;
    session.stop();
    if (persists) update(chooseVoice(packSelection(pack)));
    requestShareIntent({ voiceId: pack.id });
    replaceRoute({ screen: 'S9', params: {} });
  };

  // 完成の画面だけは本文に見出し（「録音できました」）があるので、上の行の名前は h1 にしない（Ruling 102-3）
  const header = <FocusHeader screen="S8" title={translator.t('recordTitle')} heading={step.kind !== 'done' || !pack} />;

  if (blocked === 'unsupported') {
    // D53: 安全でない接続（http）では iOS が録音の口ごと隠す。ブラウザを替えても録れないので、文は「https で開くと…」に
    const insecure = uiState === 'no-https' || (uiState !== 'no-recorder' && recorderNeedsHttps());
    return (
      <main class="dc-screen dc-screen--focus dc-record" data-screen="S8" data-step="unsupported">
        {header}
        <div class="dc-alert" role="status" data-alert={insecure ? 'no-https' : 'no-recorder'}>
          <div class="dc-alert-text dc-alert-text--solo"><b>{phrased(translator, insecure ? 'recordNeedsHttps' : 'noRecorder')}</b></div>
        </div>
      </main>
    );
  }

  if (step.kind === 'intro' || !pack) {
    const micProblem = blocked === 'denied' || blocked === 'failed';
    // D46: iPhone のブラウザで、まだ 1 語も録っていない時だけ「先にホーム画面に追加」の 1 行（読み終えるまでは出さない）
    const addFirst = saved !== null && showsRecordInstallHint({
      kind: platformKind(), standalone: isStandalone(),
      recorded: LANGUAGES.some(locale => packProgress(saved[locale]).recorded > 0)
    });
    return (
      <main class="dc-screen dc-screen--focus dc-screen--dock dc-record" data-screen="S8" data-step={micProblem ? 'denied' : 'intro'}>
        {header}
        {blocked === 'denied' ? (
          // マイクが使えない設定（Ruling 57-6・D30）: 説明 3 行の場所に枠。「設定の開き方」は同じ枠の中で 3 行に替わる。
          <div class="dc-alert" role="status" data-alert="mic-denied">
            <div class="dc-alert-text"><b>{phrased(translator, 'micDenied')}</b></div>
            {howTo
              ? <div class="dc-alert-text dc-howto"><div>{phrased(translator, 'micHowToIphone')}</div><div>{phrased(translator, 'micHowToOther')}</div><div>{phrased(translator, 'micHowToThen')}</div></div>
              : <button type="button" class="dc-alert-action" data-alert-action onClick={() => setHowTo(true)}>{translator.t('micHowTo')}</button>}
          </div>
        ) : blocked === 'failed' ? (
          // マイクが見つからない・ほかのアプリや通話が使用中（Fable Q2）: 設定ではなく、終えてからもう一度。
          <div class="dc-alert" role="status" data-alert="mic-failed">
            <div class="dc-alert-text dc-alert-text--solo"><b>{phrased(translator, 'micFailed')}</b></div>
          </div>
        ) : (
          <div class="dc-record-intro" data-body>
            <div>{phrased(translator, 'recordIntro1')}</div>
            <div>{phrased(translator, 'recordIntro2')}</div>
            <div>{phrased(translator, 'recordIntro3')}</div>
          </div>
        )}
        {!micProblem && addFirst && <div class="dc-hint dc-record-add-first">{phrased(translator, 'recordAddFirst')}</div>}
        <h2 class="dc-field-label" id="dc-s8-language">{translator.t('recordLanguage')}</h2>
        <div class="dc-radiogroup" role="radiogroup" aria-labelledby="dc-s8-language" data-group="record-language">
          {LANGUAGES.map(locale => {
            const checked = language === locale;
            const progress = packProgress(saved?.[locale] ?? null);
            return (
              <button key={locale} type="button" class="dc-radio-row dc-language-row" role="radio" aria-checked={checked ? 'true' : 'false'}
                onClick={() => { languageTouched.current = true; setLanguage(locale); }}>
                {checked ? <Icon name="check" /> : <span class="dc-ic" aria-hidden="true" />}
                <span class="dc-radio-text">
                  <span>{countLabel(translator.t(locale === 'ja-JP' ? 'countInJapanese' : 'countInEnglish'))}</span>
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
            onBlur={event => rename(event.currentTarget as HTMLInputElement)}
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
          <Icon name="mic" /><span>{translator.t('reviewFromFirst')}</span>
        </button>
        {backupTip && <div class="dc-hint dc-backup-tip">{phrased(translator, 'backupTipRecording')}</div>}
        <div class="dc-dock dc-record-dock">
          <button type="button" class="dc-button dc-button--secondary" onClick={finish}>
            <Icon name="check" /><span>{translator.t('finishDone')}</span>
          </button>
          <button type="button" class="dc-button dc-primary" onClick={share}>
            <span>{translator.t('share')}</span><Icon name="chev-r" />
          </button>
        </div>
      </main>
    );
  }

  const index = step.index;
  const prompts = wordPrompts(pack.locale, word!, translator.locale);
  const onsetAt = take ? Math.min(1, take.onsetMs / take.durationMs) : 0;
  return (
    <main class="dc-screen dc-screen--focus dc-screen--dock dc-record" data-screen="S8" data-step="word" data-recording={recording ? 'true' : 'false'} data-phase={phase}
      data-taken={take ? 'true' : 'false'} data-notice={alert !== 'none' ? alert : undefined}>
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
        {prompts.other !== null && <div class="dc-record-other" lang={pack.locale === 'ja-JP' ? 'en' : 'ja'}>{prompts.other}</div>}
      </div>
      {/* 説明の 1 行と枠は同じ高さの箱（枠が出ても丸が動かない。Ruling 72-2） */}
      {/* 録音中（D59）は同じ箱に「約 2 秒で自動で止まります」（箱の高さは同じ＝丸は動かない） */}
      <div class="dc-record-slot" data-slot={phase === 'capture' ? 'capture' : alert !== 'none' ? 'alert' : 'hint'}>
        {phase === 'capture'
          ? <p class="dc-record-hint dc-record-autostop">{phrased(translator, 'recordAutoStop')}</p>
          : alert !== 'none'
            ? <NoticeLine alert={alert} />
            : <p class="dc-record-hint">{phrased(translator, 'recordHint', { word: { text: prompts.main, nowrap: true } })}</p>}   {/* 夜間便 A-3: 語の途中で折らない */}
      </div>
      <div class="dc-rec-ring">
        {/* 合図（3・2・1・今）の間は押すと「やめる」。録音中だけ押せない（D59） */}
        <button type="button" class="dc-rec" disabled={phase === 'capture'} onClick={record} data-mark={phase === 'countdown' ? String(mark) : undefined}>
          {phase === 'countdown' ? (
            <>
              <span key={String(mark)} class={`dc-rec-count${mark === 'now' ? ' dc-rec-count--now' : ''}`} aria-live="assertive">
                {mark === 'now' ? translator.t('recordCueNow') : mark}
              </span>
              <span class="dc-rec-cancel">{translator.t('recordCancel')}</span>
            </>
          ) : phase === 'capture' ? (
            <>
              <span class="dc-rec-live"><span class="dc-rec-dot" aria-hidden="true" />{translator.t('recordingNow')}</span>
              <span class="dc-rec-bar" aria-hidden="true" style={{ '--p': String(progress) }}><span /></span>
            </>
          ) : (
            <>
              <Icon name="mic" />
              <span>{take ? translator.t('recordAgain') : translator.t('recordWord')}</span>
            </>
          )}
        </button>
      </div>
      {take && (
        <div class="dc-take">
          <svg class="dc-wave" viewBox={`0 0 ${WAVE_BARS * 4} 40`} preserveAspectRatio="none" aria-hidden="true">
            {peaks.map((peak, bar) => <rect key={bar} x={bar * 4 + 1} y={20 - Math.max(1, peak * 19)} width="2" height={Math.max(2, peak * 38)} />)}
            <rect class="dc-wave-onset" x={onsetAt * WAVE_BARS * 4} y="0" width="1.5" height="40" />
          </svg>
          <button type="button" class="dc-chip dc-listen" aria-pressed={listening ? 'true' : 'false'} disabled={recording} onClick={listen}>
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
      <div class="dc-alert-text dc-alert-text--solo"><b>{phrased(translator, alert === 'no-voice' ? 'noVoiceHeard' : 'saveFailed')}</b></div>
    </div>
  );
}
