import { decodeRecordedVoicePack } from '../../engine/recorded-voice-pack.js';
import { loadVoicePack } from '../../engine/voice-pack-loader.js';
import type { VoicePackRecord } from '../voices/store.ts';

// 同梱の標準音声（public/audio/<packId>/）。base:'./' なので文書の位置から解決する。
// fetch はここから渡す（キャッシュ方針は段7の Service Worker で決める。段1持ち越し）。
export type VoicePack = Awaited<ReturnType<typeof loadVoicePack>>;

const loaded = new WeakMap<BaseAudioContext, Map<string, Promise<VoicePack>>>();

export function loadStandardVoice(audio: BaseAudioContext, packId: string): Promise<VoicePack> {
  let packs = loaded.get(audio);
  if (!packs) loaded.set(audio, (packs = new Map()));
  let pack = packs.get(packId);
  if (!pack) {
    const manifestUrl = new URL(`audio/${packId}/manifest.json`, document.baseURI);
    pack = loadVoicePack(audio, manifestUrl, (input: RequestInfo | URL) => fetch(input));
    pack.catch(() => packs.delete(packId)); // 失敗は覚えない（オンラインに戻れば次の ▶ で読み直す）
    packs.set(packId, pack);
  }
  return pack;
}

// 録音・受け取った声（Ruling 61-3）。Blob は IndexedDB に置いたまま、decode した物を AudioContext ごと・声ごとに 1 つ記憶する。
// 語を録り直すと updatedAt が変わるので記憶を捨てて decode し直す（タイミングのつまみは updatedAt を変えない＝decode し直さない）。
const recorded = new WeakMap<BaseAudioContext, Map<string, { updatedAt: string; pack: Promise<VoicePack> }>>();

export function loadRecordedVoice(audio: BaseAudioContext, record: VoicePackRecord): Promise<VoicePack> {
  let packs = recorded.get(audio);
  if (!packs) recorded.set(audio, (packs = new Map()));
  const known = packs.get(record.id);
  if (known && known.updatedAt === record.updatedAt) return known.pack;
  const pack = decodeRecordedVoicePack(audio, record) as Promise<VoicePack>;
  pack.catch(() => { if (packs.get(record.id)?.pack === pack) packs.delete(record.id); });
  packs.set(record.id, { updatedAt: record.updatedAt, pack });
  return pack;
}
