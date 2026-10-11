import sprite from './icons.svg?raw';
import type { IconName } from './icon-names.ts';

// アイコンは装飾。必ず文字を添える（アイコン単独のボタン禁止。仕様 §5）。
export function Icon({ name, class: className = '' }: { name: IconName; class?: string }) {
  const filled = name === 'play' || name === 'stop';
  return (
    <svg class={`dc-ic${filled ? ' dc-ic--fill' : ''}${className ? ` ${className}` : ''}`} aria-hidden="true" focusable="false">
      <use href={`#i-${name}`} />
    </svg>
  );
}

// App の先頭に1回だけ置く（<use href="#i-…"> の参照先）。
export function IconSprite() {
  return <div hidden dangerouslySetInnerHTML={{ __html: sprite }} />;
}
