import { useEffect, useRef, useState } from 'preact/hooks';
import { BackButton } from '../components/BackButton.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { Icon } from '../components/Icon.tsx';
import { UpdateBanner } from '../components/UpdateBanner.tsx';
import { NoticeBox } from '../practice/controls.tsx';
import { usePracticeSession } from '../practice/use-session.ts';
import { voiceOffsetFor } from '../practice/voice-offset.ts';
import { buildHash, type UiState } from '../router/routes.ts';
import { useI18n } from '../state/i18n.ts';
import { useSettings } from '../state/settings.ts';
import { useStorage } from '../state/storage.ts';
import { voicePreviewOptions } from '../voices/preview.ts';
import { DEFAULT_VOICE, chooseVoice, forgetVoiceSettings, packDisplayName, packSelection, standardSelection, voiceDisplayName, type VoiceSelection } from '../voices/selection.ts';
import { STANDARD_VOICES } from '../voices/standard.ts';
import { VOICE_LIMITS, isCompletePack, listVoicePacks, removeVoicePack, type VoicePackRecord } from '../voices/store.ts';
import { WaltzSpinner } from '../brand/BrandMark.tsx';

// S7 声（仕様 §4 S7・Ruling 60・61・D75）。一覧 [data-group="voice"]（role="radiogroup"）: 標準 → 自分の声（完成）→ 受け取った声（完成）。
// 1 回目のタップで選ぶ（selectedVoiceId と voiceLocale を一緒に書く）。選んだ行には「▶ 試聴」（ワルツ 1 小節）。
// D75（ひとみうさ承認 2026-10-15）: S7 は「使う」の側＝声を選ぶだけ。途中の声は出さない（続き・削除は S8 の説明の画面）。
// 自分の声は選ぶだけ（もう一度タップしても開かない＝「配る」「削除」は「作る」の側。配るは S8 の完成の画面・S9）。「録音は「作る」から」の案内の行も外した。
// 選んでいる受け取った声をもう一度タップすると行が開き「削除」だけ（D37。受け取った声を消すのは「使う」の側）。
// 段5（Ruling 86-1）: 下に「ファイルから受け取る」（→ S10）。「ファイルに保存」は作らない（Ruling 82-3）。
// ui-state=confirm-delete は最初の受け取った声の削除確認を見た目だけ出す（D75 で自分の声から替えた）。
// 段8（Ruling 100-3）: 試聴で声が読めなかった（オフラインでまだ端末に入っていない）時は §11 の「この声はまだ端末に入っていません。…」の枠。
// ui-state=voice-missing はその枠を見た目だけ出す（試聴を押すか、別の行を選ぶと消える）。
// 段8（Ruling 103-2）: 声の一覧の行の上限。実際の最大は標準 2 行（英語・日本語。D78）＋声 20 行（VOICE_LIMITS.packs は自分の声・受け取った声・途中の声を合わせた総数）＝22 行。
// 上限は 2 + 2 + 20 = 24 のまま（22 行を含む。数を詰める意味は無い）。
// U5（選択肢 10 以下）の例外として ui:check に渡す（data-choices-max）。声が 4 本以上になる生徒は稀で、下のボタンはスクロールで届く
const VOICE_ROWS_MAX = 2 + 2 + VOICE_LIMITS.packs;
export function VoicesScreen({ uiState }: { uiState?: UiState }) {
  const { translator } = useI18n();
  const { settings, update } = useSettings();
  const storage = useStorage();
  const [packs, setPacks] = useState<VoicePackRecord[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<VoicePackRecord | null>(null);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const [forcedDismissed, setForcedDismissed] = useState(false);
  const { session, view } = usePracticeSession('S7');
  const previewing = view.playing || view.starting;
  const latestSettings = useRef(settings);
  latestSettings.current = settings;

  useEffect(() => {
    let alive = true;
    void listVoicePacks(storage).then(list => { if (alive) setPacks(list); });
    return () => { alive = false; };
  }, [storage]);
  useEffect(() => {
    const received = packs?.find(pack => pack.origin === 'received' && isCompletePack(pack));
    if (uiState === 'confirm-delete' && received) setDeleting(received);
  }, [uiState, packs]);

  // 段8 Task 6 fix 1（レビュー I-1）: 読み込み中の形にも、読み終えた後と同じ位置に同じ見出しを出す。Preact が同じ h1 を使い回すので、
  // 画面が替わった時に App が置いたフォーカスが h1 に残る（読み込み中に main へ落ちない）
  if (packs === null) return <main class="dc-screen" data-screen="S7" data-loading><BackButton screen="S7" /><h1 class="dc-heading">{translator.t('voicesTitle')}</h1><div class="dc-loading"><WaltzSpinner /></div></main>;

  const notice = deleteFailed ? 'save-failed' : (uiState === 'voice-missing' && !forcedDismissed) || view.notice === 'voice-missing' ? 'voice-missing' : 'none';
  const complete = packs.filter(isCompletePack);   // D75: 途中の声は出さない
  // 選んでいる声。録音の声が消えた・途中なら標準（英語）が選ばれて見える（設定は書き換えない。Ruling 61-2）。
  const chosenPack = complete.find(pack => pack.id === settings.selectedVoiceId);
  const selected: VoiceSelection = standardSelection(settings.selectedVoiceId) ?? (chosenPack ? packSelection(chosenPack) : DEFAULT_VOICE);

  const choose = (voice: VoiceSelection) => {
    setForcedDismissed(true);
    session.stop();
    session.dismissNotice();
    if (voice.id === selected.id) {
      // D75: 開くのは受け取った声だけ（自分の声は選ぶだけ）
      if (voice.kind === 'pack' && voice.pack.origin === 'received') setOpenId(openId === voice.id ? null : voice.id);
      return;
    }
    setOpenId(null);
    update(chooseVoice(voice));
  };
  const preview = () => {
    setForcedDismissed(true);
    if (previewing) { session.stop(); return; }
    void session.play(voicePreviewOptions(selected, voiceOffsetFor(settings, selected), 1));
  };
  const confirmDelete = (pack: VoicePackRecord) => {
    session.stop();
    setDeleting(null);
    setOpenId(null);
    // 端末から消えたと確かめてから一覧と設定を変える。消せなければ行を残し「保存できませんでした」（最終レビュー M4）。
    void removeVoicePack(storage, packs, pack.id).then(next => {
      setDeleteFailed(next === null);
      if (next === null) return;
      setPacks(current => (current ? current.filter(item => item.id !== pack.id) : next));
      update(forgetVoiceSettings(latestSettings.current, pack.id));
    });
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
        {open && voice.kind === 'pack' && voice.pack.origin === 'received' && <VoiceActions onDelete={() => setDeleting(voice.pack)} />}
      </div>
    );
  };

  return (
    <main class="dc-screen" data-screen="S7">
      <BackButton screen="S7" />
      <h1 class="dc-heading">{translator.t('voicesTitle')}</h1>
      {/* 枠は同時に 1 つ（Ruling 30）: 知らせが出ている間は更新の帯を引っ込め、閉じたら戻す（段7 最終レビュー m2） */}
      {notice === 'none' && <UpdateBanner />}
      <NoticeBox notice={notice} onClose={() => setDeleteFailed(false)} />
      <div class="dc-radiogroup" role="radiogroup" aria-label={translator.t('voicesTitle')} data-group="voice" data-choices-max={VOICE_ROWS_MAX}>
        {STANDARD_VOICES.map(voice => radioRow({ kind: 'standard', id: voice.id, locale: voice.locale }, voiceDisplayName(translator, { kind: 'standard', id: voice.id, locale: voice.locale }, 'row')))}
        {complete.filter(pack => pack.origin === 'recorded').map(pack => radioRow(packSelection(pack), packDisplayName(translator, pack)))}
        {complete.filter(pack => pack.origin === 'received').map(pack => radioRow(packSelection(pack), packDisplayName(translator, pack)))}
      </div>
      <div class="dc-voice-entry">
        <a class="dc-button dc-button--secondary dc-wide dc-receive-link" href={buildHash({ screen: 'S10', params: {} })}>
          <span>{translator.t('receiveFromFile')}</span>
        </a>
      </div>
      {deleting && (
        <ConfirmDialog title={translator.t('confirmDeleteVoiceTitle')} detail={packDisplayName(translator, deleting)} confirmLabel={translator.t('confirmDelete')}
          onCancel={() => setDeleting(null)} onConfirm={() => confirmDelete(deleting)} />
      )}
    </main>
  );
}

// 開いた行の操作（受け取った声の「削除」だけ。D37・D75）。群は 1 つ（主要操作 1）。
function VoiceActions({ onDelete }: { onDelete(): void }) {
  const { translator } = useI18n();
  return (
    <div class="dc-row-actions dc-voice-actions" data-group="voice-actions">
      <button type="button" class="dc-button dc-button--secondary" onClick={onDelete}>
        <Icon name="trash" /><span>{translator.t('delete')}</span>
      </button>
    </div>
  );
}
