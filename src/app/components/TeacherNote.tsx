import { useI18n } from '../state/i18n.ts';

// 先生からのひとこと（D68・ひとみうさ指示 2026-10-14）。S10 の「受け取りました」と、受け取ったルーティンの S5（フィガーの一覧の上・compact）。
// 中身はファイルから来た文字（share/note.ts で見えない文字を除き 80 字まで）。文字としてだけ描く（HTML として解釈しない）。
export function TeacherNote({ note, compact = false }: { note: string; compact?: boolean }) {
  const { translator } = useI18n();
  return (
    <div class={`dc-teacher-note${compact ? ' dc-teacher-note--compact' : ''}`} data-teacher-note>
      <div class="dc-teacher-note-label">{translator.t('teacherNote')}</div>
      <div class="dc-teacher-note-text">{note}</div>
    </div>
  );
}
