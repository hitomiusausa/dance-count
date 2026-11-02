import type { PlatformKind } from '../platform/pwa.ts';

// 夜間便 A-4（Ruling 123・監査 #16）: 画面が暗くなる案内の文を端末で分ける。「自動ロック／Auto-Lock」は iPhone・iPad の設定の語なので、
// iOS（platformKind の ios-safari・ios-other）だけ今の文、それ以外（Android・PC・Mac 風 UA の iPad）は「画面が消えるまでの時間」の文。
// 判定は既存の platformKind をそのまま使う（新しい判定は作らない）。
export function wakeLockTipKey(kind: PlatformKind): 'wakeLockTip' | 'wakeLockTipOther' {
  return kind === 'ios-safari' || kind === 'ios-other' ? 'wakeLockTip' : 'wakeLockTipOther';
}
