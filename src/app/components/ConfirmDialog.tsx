import { useEffect, useRef } from 'preact/hooks';
import { useI18n } from '../state/i18n.ts';

// 確認ダイアログ（仕様 §6 手動レビュー・Ruling 44）。質問1つ・ボタン2つ・取り消しが左。
// ブラウザの confirm() は文言とボタン順を決められないので使わない。Esc は「やめる」と同じ。
export function ConfirmDialog({ title, detail, confirmLabel, onCancel, onConfirm }: {
  title: string; detail?: string; confirmLabel: string; onCancel(): void; onConfirm(): void;
}) {
  const { translator } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    return () => { if (element?.open) element.close(); };
  }, []);
  return (
    <dialog ref={dialog} class="dc-dialog" role="alertdialog" aria-labelledby="dc-dialog-title" data-confirm
      onCancel={event => { event.preventDefault(); onCancel(); }}>
      <p id="dc-dialog-title" class="dc-dialog-title">{title}</p>
      {detail && <p class="dc-dialog-detail">{detail}</p>}
      <div class="dc-dialog-buttons">
        <button type="button" class="dc-button dc-button--secondary" data-cancel onClick={onCancel}>{translator.t('cancel')}</button>
        <button type="button" class="dc-button dc-primary" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </dialog>
  );
}
