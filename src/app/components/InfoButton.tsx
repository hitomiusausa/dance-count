import { useId, useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { MessageKey } from '../i18n/index.ts';
import { phrased } from '../i18n/phrased.tsx';
import { focusedElement, onDismissSignals } from '../platform/page.ts';
import { useI18n } from '../state/i18n.ts';
import { Icon } from './Icon.tsx';

// 見出しの横の ⓘ（D66・ひとみうさ指示 2026-10-14）。押すと見出しの下に小さい説明の箱が重なって出る（下の物は動かさない）。
// - 仕様 §5「アイコン単独のボタン禁止」の例外（ひとみうさの指示で ⓘ の形）。名前は「この画面について」（aria-label）・aria-expanded・aria-controls。
// - 閉じ方: 箱の「閉じる」・箱の外を押す・Esc。「閉じる」と Esc はフォーカスを ⓘ に戻す（外を押した時は押した所に任せる。箱の中にフォーカスがあった時だけ ⓘ へ）。
// - 開いてもフォーカスは ⓘ のまま（開閉の型）。箱は DOM で ⓘ のすぐ後＝読み上げは続けて読める。
// - 主要操作には数えない（[data-utility]。言語の切り替えと同じ）。箱の位置は親の .dc-title-row（position: relative）の下端。
export function InfoButton({ textKey }: { textKey: MessageKey }) {
  const { translator } = useI18n();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const id = `dc-info-${useId()}`;

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) button.current?.focus({ preventScroll: true });
  };

  // 開いたらすぐ（描画を待たずに）聞き始める（useEffect は描画の後まで遅れることがあり、すぐの外のタップを取りこぼした）
  useLayoutEffect(() => {
    if (!open) return undefined;
    return onDismissSignals({
      escape: event => { event.preventDefault(); close(true); },
      pointerDown: target => {
        if (!target || box.current?.contains(target) || button.current?.contains(target)) return;
        close(!!box.current?.contains(focusedElement()));
      }
    });
  }, [open]);

  return (
    <>
      <button ref={button} type="button" class="dc-info-button" data-utility data-info aria-label={translator.t('aboutThisScreen')}
        aria-expanded={open ? 'true' : 'false'} aria-controls={id} onClick={() => setOpen(value => !value)}>
        <Icon name="info" />
      </button>
      <div ref={box} id={id} class="dc-info-pop" role="region" aria-label={translator.t('aboutThisScreen')} hidden={!open} data-info-pop>
        <p class="dc-info-text">{phrased(translator, textKey)}</p>
        <button type="button" class="dc-info-close" data-utility onClick={() => close(true)}>
          <Icon name="close" /><span>{translator.t('close')}</span>
        </button>
      </div>
    </>
  );
}
