// VOICEVOX（無料・ローカル HTTP API）。v1 の標準の日本語からは外す（D27）が、第 3 候補の口だけ作っておく（Ruling 69-3）。
// --yes が無ければ接続しない（generate.js が provider を作る前に止める）。24kHz で来るので pipeline で 48kHz に揃える。
// 作った音声は VOICEVOX とキャラクターごとの規約に従い、クレジット表記が要る（F15）。
import { parsePcm16Wav } from '../wav.js';

export const VOICEVOX_URL = 'http://localhost:50021';

export function createVoicevoxProvider({ voice, rate = 1, credit, fetch = globalThis.fetch, baseUrl = VOICEVOX_URL }) {
  const speaker = String(voice);
  return {
    id: 'voicevox',
    paid: false,
    describe: () => ({ provider: 'voicevox', name: `VOICEVOX ${credit ?? speaker}`, voiceName: `voicevox-speaker-${speaker}`, credit: credit ? `VOICEVOX:${credit}` : `VOICEVOX:（話者 ${speaker} のキャラクター名を確認して書く）` }),
    async synthesize({ key, text }) {
      const query = await fetch(`${baseUrl}/audio_query?${new URLSearchParams({ text, speaker })}`, { method: 'POST' });
      if (!query.ok) throw new Error(`VOICEVOX audio_query failed for ${key}: ${query.status}`);
      const body = await query.json();
      body.speedScale = rate;
      const synthesis = await fetch(`${baseUrl}/synthesis?${new URLSearchParams({ speaker })}`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
      });
      if (!synthesis.ok) throw new Error(`VOICEVOX synthesis failed for ${key}: ${synthesis.status}`);
      const wav = parsePcm16Wav(Buffer.from(await synthesis.arrayBuffer()));
      return { pcm: wav.samples, sampleRate: wav.sampleRate, meta: { speaker, rate } };
    }
  };
}
