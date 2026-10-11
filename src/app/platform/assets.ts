import { loadVoicePack } from '../../engine/voice-pack-loader.js';

// 同梱の標準音声（public/audio/<packId>/）。base:'./' なので文書の位置から解決する。
// fetch はここから渡す（キャッシュ方針は段7の Service Worker で決める。段1持ち越し）。
export type VoicePack = Awaited<ReturnType<typeof loadVoicePack>>;

const loaded = new WeakMap<AudioContext, Map<string, Promise<VoicePack>>>();

export function loadStandardVoice(audio: AudioContext, packId: string): Promise<VoicePack> {
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
