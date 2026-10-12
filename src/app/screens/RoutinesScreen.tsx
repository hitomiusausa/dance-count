import { useEffect, useState } from 'preact/hooks';
import { BackButton } from '../components/BackButton.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { Icon } from '../components/Icon.tsx';
import { UpdateBanner } from '../components/UpdateBanner.tsx';
import { NoticeBox } from '../practice/controls.tsx';
import { danceName } from '../i18n/index.ts';
import { phrased } from '../i18n/phrased.tsx';
import { honorific } from '../lib/honorific.ts';
import { unlockAudioInsideTap } from '../platform/audio-context.ts';
import { buildHash, type UiState } from '../router/routes.ts';
import { ROUTINES_MAX } from '../routines/limits.ts';
import { routinePlayability, type Routine } from '../routines/routine.ts';
import { requestAutoplay } from '../state/autoplay.ts';
import { requestShareIntent } from '../state/share-intent.ts';
import { useI18n } from '../state/i18n.ts';
import { navigate } from '../state/route.ts';
import { useRoutines } from '../state/routines.ts';

// ルーティン一覧（仕様 §4・Ruling 35・40・41・44）。D56（Ruling 115-2・115-3）で 2 つの形に分けた（一覧の中身・並びは同じ＝作った順）:
// - mode 'use'＝U2「使う › ルーティン」: 「ファイルから受け取る」→ 一覧。行を押すとすぐ鳴る（行全体が 1 つのボタン・右端に「▶ 再生」の札）。
//   鳴らせない行はボタンにせず、注意 1 行（「作る」で直せます）。一覧の下に「直す・消す時は表紙の「作る」から」の 1 行。編集・削除・配るは置かない。
// - mode 'make'＝M1「作る › ルーティン」（今までの S3）: 「＋ 新しいルーティン」→ 一覧。行をタップで開く（同時に1つ）。開いた行: 鳴らせる時は ▶ 試聴（S5 で即再生）・編集・
//   配る（→ S9 にこのルーティンを選んだ状態で。Ruling 86-4）・削除。受け取ったルーティンも並び、直せる（Ruling 84-3）。
// ui-state=confirm-delete は M1 の最初の行の削除確認を見た目だけ出す（Ruling 43）。
export function RoutinesScreen({ mode, uiState }: { mode: 'use' | 'make'; uiState?: UiState }) {
  const { translator } = useI18n();
  const { routines, remove } = useRoutines();
  const [openId, setOpenId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Routine | null>(null);
  const [deleteFailed, setDeleteFailed] = useState(false);   // 端末から消せなかった（画面を離れるまで出す）
  const locale = translator.locale;
  useEffect(() => { if (mode === 'make' && uiState === 'confirm-delete' && routines[0]) setDeleting(routines[0]); }, [uiState]);

  // ▶: このタップの中で音を解除し、一回限りの印を付けて S5 へ（Ruling 32・40）。
  const play = (routine: Routine) => {
    try { unlockAudioInsideTap(); } catch { /* 音が使えない端末は S5 の2秒判定で案内する */ }
    requestAutoplay({ kind: 'routine', id: routine.id });
    navigate({ screen: 'S5', params: { routineId: routine.id } });
  };

  const summaryOf = (routine: Routine) => {
    const dance = danceName(routine.danceId, locale);
    const count = routine.figures.length;
    const summary = count === 1 ? translator.t('routineSummaryOne', { dance }) : translator.t('routineSummary', { dance, count });
    return `${summary}${routine.receivedFrom ? ` · ${translator.t('receivedFrom', { name: honorific(routine.receivedFrom.distributor, translator.locale) })}` : ''}`;
  };

  if (mode === 'use') return (
    <main class="dc-screen dc-routines-use" data-screen="U2">
      <BackButton screen="U2" />
      <h1 class="dc-heading">{translator.t('routinesTitle')}</h1>
      <UpdateBanner />
      <a class="dc-button dc-button--secondary dc-wide dc-receive-link" href={buildHash({ screen: 'S10', params: {} })}>
        <span>{translator.t('receiveFromFile')}</span>
      </a>
      {routines.length === 0
        ? <p class="dc-empty" data-body>{phrased(translator, 'routinesEmpty')}</p>
        : (
          <div class="dc-list" role="list" data-list>
            {routines.map(routine => {
              const playability = routinePlayability(routine);
              const text = (
                <span class="dc-row-text">
                  <b data-ellipsis>{routine.name}</b>
                  <small>{summaryOf(routine)}</small>
                  {playability !== 'ok' && (
                    <small class="dc-row-warn"><Icon name="alert" />{phrased(translator, playability === 'empty' ? 'cannotPlayEmpty' : 'cannotPlayFix')}</small>
                  )}
                </span>
              );
              return (
                <div key={routine.id} role="listitem" class="dc-row" data-row>
                  {playability === 'ok'
                    ? <button type="button" class="dc-row-head dc-row--play" onClick={() => play(routine)}>
                        {text}
                        <span class="dc-play-tag"><Icon name="play" /><span>{translator.t('play')}</span></span>
                      </button>
                    : <div class="dc-row-head dc-row--off" data-row-off>{text}</div>}
                </div>
              );
            })}
          </div>
        )}
      <div class="dc-hint dc-edit-in-make">{phrased(translator, 'editFromMake')}</div>
    </main>
  );

  return (
    <main class="dc-screen" data-screen="M1">
      <BackButton screen="M1" />
      <h1 class="dc-heading">{translator.t('makeRoutines')}</h1>
      {/* 枠は同時に 1 つ（Ruling 30）: 知らせが出ている間は更新の帯を引っ込め、閉じたら戻す（段7 最終レビュー m2） */}
      {!deleteFailed && <UpdateBanner />}
      <NoticeBox notice={deleteFailed ? 'save-failed' : 'none'} onClose={() => setDeleteFailed(false)} />
      <button type="button" class="dc-button dc-primary dc-wide" disabled={routines.length >= ROUTINES_MAX}
        onClick={() => navigate({ screen: 'S4', params: {} })}>
        <Icon name="plus" /><span>{translator.t('newRoutine')}</span>
      </button>
      {routines.length === 0
        ? <p class="dc-empty" data-body>{phrased(translator, 'routinesEmpty')}</p>
        : (
          <div class="dc-list" role="list" data-list>
            {routines.map(routine => {
              const open = routine.id === openId;
              const playability = routinePlayability(routine);
              return (
                <div key={routine.id} role="listitem" class="dc-row" data-row data-open={open ? '' : undefined}>
                  <button type="button" class="dc-row-head" aria-expanded={open ? 'true' : 'false'} onClick={() => setOpenId(open ? null : routine.id)}>
                    <span class="dc-row-text">
                      <b>{routine.name}</b>
                      <small>{summaryOf(routine)}</small>
                    </span>
                    <Icon name="chevron" class="dc-row-chev" />
                  </button>
                  {open && (
                    <div class="dc-row-body" data-row-body>
                      {playability !== 'ok' && <p class="dc-row-note">{phrased(translator, playability === 'empty' ? 'needsFigures' : 'needsFix')}</p>}
                      <div class="dc-row-actions" data-group="routine-actions">
                        {playability === 'ok' && (
                          <button type="button" class="dc-button dc-primary dc-wide" onClick={() => play(routine)}>
                            <Icon name="play" /><span>{translator.t('previewVoice')}</span>
                          </button>
                        )}
                        <button type="button" class="dc-button dc-button--secondary" onClick={() => navigate({ screen: 'S4', params: { routineId: routine.id } })}>
                          <Icon name="edit" /><span>{translator.t('edit')}</span>
                        </button>
                        {playability === 'ok' && (
                          <button type="button" class="dc-button dc-button--secondary"
                            onClick={() => { requestShareIntent({ routineId: routine.id }); navigate({ screen: 'S9', params: {} }); }}>
                            <Icon name="share" /><span>{translator.t('share')}</span>
                          </button>
                        )}
                        <button type="button" class="dc-button dc-button--secondary" onClick={() => setDeleting(routine)}>
                          <Icon name="trash" /><span>{translator.t('delete')}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      {deleting && (
        <ConfirmDialog title={translator.t('confirmDeleteTitle')} detail={deleting.name} confirmLabel={translator.t('confirmDelete')}
          onCancel={() => setDeleting(null)}
          onConfirm={() => { void remove(deleting.id).then(ok => setDeleteFailed(!ok)); setDeleting(null); setOpenId(null); }} />
      )}
    </main>
  );
}
