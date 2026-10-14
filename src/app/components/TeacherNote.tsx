import { useI18n } from '../state/i18n.ts';
import { TeacherFace } from '../brand/BrandMark.tsx';

// 先生からのひとこと（D68・ひとみうさ指示 2026-10-14）。S10 の「受け取りました」と、受け取ったルーティンの S5（フィガーの一覧の上・compact）。
// 見た目は「C 吹き出し」（ひとみうさ 2026-10-14）: 左に男性のうさぎ先生の丸い顔・右に角が 1 つだけ尖った吹き出し。
// 中身はファイルから来た文字（share/note.ts で見えない文字を除き 80 字まで）。文字としてだけ描く（HTML として解釈しない）。
// head: S5 の見出しのすぐ下・副題の 1 行の代わり（「くわしく」や一覧を開かなくても見える。ひとみうさ 2026-10-14）。押せる物は足さず（U4）、
// 高さも副題とほぼ同じ 1 行（足すと 375×548 で速さの選択肢が初期表示から落ちる）。省略される長さ（HEAD_FULL_MAX 字より長い）の時だけ
// 一覧の上に全文の compact を残す（見返せる）。見出し「先生から」は描かず、読み上げの名前にだけ渡す。
export const HEAD_FULL_MAX = 16;
export function TeacherNote({ note, compact = false, head = false }: { note: string; compact?: boolean; head?: boolean }) {
  const { translator } = useI18n();
  return (
    <div class={`dc-teacher-note${compact ? ' dc-teacher-note--compact' : ''}${head ? ' dc-teacher-note--head' : ''}`} data-teacher-note={head ? 'head' : ''}
      role={head ? 'note' : undefined} aria-label={head ? translator.t('teacherNote') : undefined}>
      <TeacherFace />
      <div class="dc-teacher-note-bubble">
        {!head && <div class="dc-teacher-note-label">{translator.t('teacherNote')}</div>}
        <div class="dc-teacher-note-text" data-ellipsis={head ? true : undefined}>{note}</div>
      </div>
    </div>
  );
}
