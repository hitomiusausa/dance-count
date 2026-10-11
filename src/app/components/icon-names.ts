// icons.svg の <symbol id="i-…"> と一致させる（test/app/icons.test.ts が検査）。
export const ICON_NAMES = [
  'play', 'stop', 'globe', 'chevron', 'chev-r', 'chev-l', 'repeat', 'metronome', 'gauge',
  'voice', 'leadin', 'check', 'mic', 'alert', 'home', 'list', 'gear'
] as const;
export type IconName = typeof ICON_NAMES[number];
