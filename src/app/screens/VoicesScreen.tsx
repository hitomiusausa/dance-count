import { useEffect, useState } from 'preact/hooks';
import { BackButton } from '../components/BackButton.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { Icon } from '../components/Icon.tsx';
import { NoticeBox } from '../practice/controls.tsx';
import { usePracticeSession } from '../practice/use-session.ts';
import { voiceOffsetFor } from '../practice/voice-offset.ts';
import { buildHash, type UiState } from '../router/routes.ts';
import { useI18n } from '../state/i18n.ts';
import { requestRecordLanguage } from '../state/record-language.ts';
import { navigate } from '../state/route.ts';
import { useSettings } from '../state/settings.ts';
import { useStorage } from '../state/storage.ts';
import { voicePreviewOptions } from '../voices/preview.ts';
import { DEFAULT_VOICE, chooseVoice, forgetVoiceSettings, packDisplayName, packSelection, standardSelection, voiceDisplayName, type VoiceSelection } from '../voices/selection.ts';
import { STANDARD_VOICES } from '../voices/standard.ts';
import { deleteVoicePack, isCompletePack, listVoicePacks, packProgress, type VoicePackRecord } from '../voices/store.ts';

// S7 声（仕様 §4 S7・Ruling 60・61）。一覧 [data-group="voice"]（role="radiogroup"）: 標準 → 自分の声（完成）→ 受け取った声 → 途中の声。
// 1 回目のタップで選ぶ（selectedVoiceId と voiceLocale を一緒に書く）。選んだ行には「▶ 試聴」（ワルツ 1 小節）。
// 選んでいる自分の声・受け取った声をもう一度タップすると行が開き「削除」（同時に 1 つ）。途中の声は選べない行（role="button"）で、
// タップすると開いて「続きを録音する」と「削除」（計画 Open question 1）。下に「自分の声を録音する」（→ S8）。
// 「ファイルから受け取る」「配る」「ファイルに保存」は段5（Ruling 55-3）。ui-state=confirm-delete は最初の録音の声の削除確認を見た目だけ出す。
export function VoicesScreen({ uiState }: { uiState?: UiState }) {
  const { translator } = useI18n();
  const { settings, update } = useSettings();
  const storage = useStorage();
  const [packs, setPacks] = useState<VoicePackRecord[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<VoicePackRecord | null>(null);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const { session, view } = usePracticeSession('S7');
  const previewing = view.playing || view.starting;

  useEffect(() => {
    let alive = true;
    void listVoicePacks(storage).then(list => { if (alive) setPacks(list); });
    return () => { alive = false; };
  }, [storage]);
  useEffect(() => { if (uiState === 'confirm-delete' && packs?.[0]) setDeleting(packs[0]); }, [uiState, packs]);

  if (packs === null) return <main class="dc-screen" data-screen="S7" data-loading><BackButton screen="S7" /></main>;

  const complete = packs.filter(isCompletePack);
  const partial = packs.filter(pack => !isCompletePack(pack));
  // 選んでいる声。録音の声が消えた・途中なら標準（英語）が選ばれて見える（設定は書き換えない。Ruling 61-2）。
  const chosenPack = complete.find(pack => pack.id === settings.selectedVoiceId);
  const selected: VoiceSelection = standardSelection(settings.selectedVoiceId) ?? (chosenPack ? packSelection(chosenPack) : DEFAULT_VOICE);

  const choose = (voice: VoiceSelection) => {
    session.stop();
    if (voice.id === selected.id) {
      if (voice.kind === 'pack') setOpenId(openId === voice.id ? null : voice.id);
      return;
    }
    setOpenId(null);
    update(chooseVoice(voice));
  };
  const preview = () => {
    if (previewing) { session.stop(); return; }
    void session.play(voicePreviewOptions(selected, voiceOffsetFor(settings, selected), 1));
  };
  const confirmDelete = (pack: VoicePackRecord) => {
    session.stop();
    setDeleting(null);
    setOpenId(null);
    setPacks(packs.filter(item => item.id !== pack.id));
    update(forgetVoiceSettings(settings, pack.id));
    void deleteVoicePack(storage, pack.id).then(ok => setDeleteFailed(!ok));
  };

  const radioRow = (voice: VoiceSelection, name: string) => {
    const checked = voice.id === selected.id;
    const open = openId === voice.id;
    return (
      <div key={voice.id} class="dc-voice-row" data-open={open ? '' : undefined}>
        <div class="dc-voice-line">
          <button type="button" class="dc-radio-row" role="radio" aria-checked={checked ? 'true' : 'false'} onClick={() => choose(voice)}>
            {checked ? <Icon name="check" /> : <span class="dc-ic" aria-hidden="true" />}
            <span class="dc-voice-name">{name}</span>
          </button>
          {checked && (
            <button type="button" class="dc-chip dc-voice-preview" aria-pressed={previewing ? 'true' : 'false'} onClick={preview}>
              <Icon name={previewing ? 'stop' : 'play'} /><span>{previewing ? translator.t('stop') : translator.t('previewVoice')}</span>
            </button>
          )}
        </div>
        {open && voice.kind === 'pack' && <VoiceActions onDelete={() => setDeleting(voice.pack)} />}
      </div>
    );
  };

  return (
    <main class="dc-screen" data-screen="S7">
      <BackButton screen="S7" />
      <h1 class="dc-heading">{translator.t('voicesTitle')}</h1>
      <NoticeBox notice={deleteFailed ? 'save-failed' : 'none'} onClose={() => setDeleteFailed(false)} />
      <div class="dc-radiogroup" role="radiogroup" aria-label={translator.t('voicesTitle')} data-group="voice">
        {STANDARD_VOICES.map(voice => radioRow({ kind: 'standard', id: voice.id, locale: voice.locale }, voiceDisplayName(translator, { kind: 'standard', id: voice.id, locale: voice.locale }, 'row')))}
        {complete.filter(pack => pack.origin === 'recorded').map(pack => radioRow(packSelection(pack), packDisplayName(translator, pack)))}
        {complete.filter(pack => pack.origin === 'received').map(pack => radioRow(packSelection(pack), packDisplayName(translator, pack)))}
        {partial.map(pack => {
          const open = openId === pack.id;
          return (
            <div key={pack.id} class="dc-voice-row" data-open={open ? '' : undefined}>
              <button type="button" class="dc-radio-row dc-voice-partial" aria-expanded={open ? 'true' : 'false'} onClick={() => { session.stop(); setOpenId(open ? null : pack.id); }}>
                <Icon name="mic" />
                {/* 名前は押せる行の色・数だけ灰色（Ruling 73）。textContent は「名前 · 7 / 12 語」のまま */}
                <span class="dc-voice-name"><span>{packDisplayName(translator, pack)}</span> <small class="dc-voice-count">{translator.t('voiceInProgressCount', { count: packProgress(pack).recorded })}</small></span>
                <Icon name="chevron" class="dc-row-chev" />
              </button>
              {open && (
                <VoiceActions onDelete={() => setDeleting(pack)}
                  onContinue={() => { requestRecordLanguage(pack.locale); navigate({ screen: 'S8', params: {} }); }} />
              )}
            </div>
          );
        })}
      </div>
      <a class="dc-button dc-primary dc-wide dc-record-link" href={buildHash({ screen: 'S8', params: {} })}>
        <Icon name="mic" /><span>{translator.t('recordVoice')}</span>
      </a>
      {deleting && (
        <ConfirmDialog title={translator.t('confirmDeleteVoiceTitle')} detail={packDisplayName(translator, deleting)} confirmLabel={translator.t('confirmDelete')}
          onCancel={() => setDeleting(null)} onConfirm={() => confirmDelete(deleting)} />
      )}
    </main>
  );
}

// 開いた行の操作（段4は削除と、途中の声の「続きを録音する」。段5で「配る」「ファイルに保存」を同じ群に足す）。
function VoiceActions({ onDelete, onContinue }: { onDelete(): void; onContinue?(): void }) {
  const { translator } = useI18n();
  return (
    <div class="dc-row-actions dc-voice-actions" data-group="voice-actions">
      {onContinue && (
        <button type="button" class="dc-button dc-button--secondary" onClick={onContinue}>
          <Icon name="mic" /><span>{translator.t('continueRecording')}</span>
        </button>
      )}
      <button type="button" class="dc-button dc-button--secondary" onClick={onDelete}>
        <Icon name="trash" /><span>{translator.t('delete')}</span>
      </button>
    </div>
  );
}
