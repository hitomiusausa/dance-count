import { useEffect, useState } from 'preact/hooks';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { Icon } from '../components/Icon.tsx';
import { danceName } from '../i18n/index.ts';
import { unlockAudioInsideTap } from '../platform/audio-context.ts';
import type { UiState } from '../router/routes.ts';
import { ROUTINES_MAX } from '../routines/limits.ts';
import { routinePlayability, type Routine } from '../routines/routine.ts';
import { requestAutoplay } from '../state/autoplay.ts';
import { useI18n } from '../state/i18n.ts';
import { navigate } from '../state/route.ts';
import { useRoutines } from '../state/routines.ts';

// S3 ルーティン一覧（仕様 §4・Ruling 35・40・41・44）。上から「＋ 新しいルーティン」→ 一覧（作った順）。
// 行をタップで開く（同時に1つ）。開いた行: 鳴らせる時は ▶ 再生（S5 で即再生）・編集・削除。
// 「配る」は段5で足す（Ruling 41）。ui-state=confirm-delete は最初の行の削除確認を見た目だけ出す（Ruling 43）。
export function RoutinesScreen({ uiState }: { uiState?: UiState }) {
  const { translator } = useI18n();
  const { routines, remove } = useRoutines();
  const [openId, setOpenId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Routine | null>(null);
  const locale = translator.locale;
  useEffect(() => { if (uiState === 'confirm-delete' && routines[0]) setDeleting(routines[0]); }, [uiState]);

  // ▶: このタップの中で音を解除し、一回限りの印を付けて S5 へ（Ruling 32・40）。
  const play = (routine: Routine) => {
    try { unlockAudioInsideTap(); } catch { /* 音が使えない端末は S5 の2秒判定で案内する */ }
    requestAutoplay({ kind: 'routine', id: routine.id });
    navigate({ screen: 'S5', params: { routineId: routine.id } });
  };

  return (
    <main class="dc-screen" data-screen="S3">
      <h1 class="dc-heading">{translator.t('routinesTitle')}</h1>
      <button type="button" class="dc-button dc-primary dc-wide" disabled={routines.length >= ROUTINES_MAX}
        onClick={() => navigate({ screen: 'S4', params: {} })}>
        <Icon name="plus" /><span>{translator.t('newRoutine')}</span>
      </button>
      {routines.length === 0
        ? <p class="dc-empty" data-body>{translator.t('routinesEmpty')}</p>
        : (
          <div class="dc-list" role="list" data-list>
            {routines.map(routine => {
              const open = routine.id === openId;
              const playability = routinePlayability(routine);
              const dance = danceName(routine.danceId, locale);
              const count = routine.figures.length;
              const summary = count === 1 ? translator.t('routineSummaryOne', { dance }) : translator.t('routineSummary', { dance, count });
              return (
                <div key={routine.id} role="listitem" class="dc-row" data-row data-open={open ? '' : undefined}>
                  <button type="button" class="dc-row-head" aria-expanded={open ? 'true' : 'false'} onClick={() => setOpenId(open ? null : routine.id)}>
                    <span class="dc-row-text">
                      <b>{routine.name}</b>
                      <small>{summary}{routine.receivedFrom ? ` · ${translator.t('receivedFrom', { name: routine.receivedFrom.distributor })}` : ''}</small>
                    </span>
                    <Icon name="chevron" class="dc-row-chev" />
                  </button>
                  {open && (
                    <div class="dc-row-body" data-row-body>
                      {playability !== 'ok' && <p class="dc-row-note">{translator.t(playability === 'empty' ? 'needsFigures' : 'needsFix')}</p>}
                      <div class="dc-row-actions" data-group="routine-actions">
                        {playability === 'ok' && (
                          <button type="button" class="dc-button dc-primary dc-wide" onClick={() => play(routine)}>
                            <Icon name="play" /><span>{translator.t('play')}</span>
                          </button>
                        )}
                        <button type="button" class="dc-button dc-button--secondary" onClick={() => navigate({ screen: 'S4', params: { routineId: routine.id } })}>
                          <Icon name="edit" /><span>{translator.t('edit')}</span>
                        </button>
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
          onConfirm={() => { void remove(deleting.id); setDeleting(null); setOpenId(null); }} />
      )}
    </main>
  );
}
