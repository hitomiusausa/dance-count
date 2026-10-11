import type { VoiceLocale } from './ids.ts';
import standardVoices from './standard-voices.json' with { type: 'json' };

// 同梱の標準の声（Ruling 60-5・68-3）。正本は standard-voices.json（段6a が作る。tools/check-dist.js も同じ JSON を読み、
// JSON の ID ごとに dist/audio/<id>/manifest.json がある・JSON に無いパックは出荷しない、を確かめる）。
// 日本語（default-ja-female-v1）は段6c が JSON に 1 行足すだけで S7 に出る。ここで別の定数を持たない。
export interface StandardVoice { id: string; locale: VoiceLocale }

export const STANDARD_VOICES: readonly StandardVoice[] = Object.freeze(
  (standardVoices satisfies ReadonlyArray<{ id: string; locale: string }>).map(voice => Object.freeze({
    id: voice.id,
    locale: voice.locale === 'ja-JP' ? 'ja-JP' as const : 'en' as const
  }))
);

export function findStandardVoice(id: string): StandardVoice | undefined {
  return STANDARD_VOICES.find(voice => voice.id === id);
}
