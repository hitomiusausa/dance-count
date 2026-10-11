import { compileRhythm } from '../../engine/rhythm-compiler.js';

// 種目の副題・カウントの型・大きな現在カウントに共通の表示語（Ruling 22・28）。
// 声の言語・UI 言語に依存しない。count-vocabularies の prompts（録音用の表記）は使わない。拍子は出さない。
const DISPLAY_BY_VOICE_KEY: Record<string, string> = {
  one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8',
  slow: 'S', quick: 'Q', and: '&', ah: 'a'
};

export function displayForVoiceKey(voiceKey: string | null | undefined): string {
  return voiceKey && Object.hasOwn(DISPLAY_BY_VOICE_KEY, voiceKey) ? DISPLAY_BY_VOICE_KEY[voiceKey]! : '';
}

// カウントの型（例 '12&3'）→ '1 2 & 3'。声の無いトークン（@ 等）は表示しない。
export function formatCounts(danceId: string, counts: string): string {
  const { events } = compileRhythm({ danceId, counts }) as { events: Array<{ voiceKey: string | null }> };
  return events.map(event => displayForVoiceKey(event.voiceKey)).filter(Boolean).join(' ');
}
