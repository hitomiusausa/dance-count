// 波形ミニ表示（Ruling 59-2）の縦線の高さ。S8 が録った 16bit PCM の WAV（encodeAudioBufferAsWav の形・ヘッダ 44 バイト）を
// そのまま読む（AudioContext を使わない＝タップの外でも描ける）。形が違えば空（波形を出さない）。値は 0〜1（最大の線が 1）。
export const WAVE_BARS = 40;

export function wavPeaks(bytes: ArrayBuffer, bars = WAVE_BARS): number[] {
  if (bytes.byteLength <= 44) return [];
  const view = new DataView(bytes);
  if (ascii(view, 0) !== 'RIFF' || ascii(view, 8) !== 'WAVE' || ascii(view, 36) !== 'data') return [];
  const channels = view.getUint16(22, true);
  if (channels < 1 || view.getUint16(34, true) !== 16) return [];
  const frames = Math.floor((bytes.byteLength - 44) / (2 * channels));
  if (frames < bars) return [];
  const per = Math.floor(frames / bars);
  const peaks: number[] = [];
  for (let bar = 0; bar < bars; bar += 1) {
    const end = bar === bars - 1 ? frames : (bar + 1) * per;
    let peak = 0;
    for (let frame = bar * per; frame < end; frame += 1) peak = Math.max(peak, Math.abs(view.getInt16(44 + frame * 2 * channels, true)) / 0x8000);
    peaks.push(peak);
  }
  const max = Math.max(...peaks);
  return max > 0 ? peaks.map(peak => Math.round((peak / max) * 100) / 100) : peaks;
}

function ascii(view: DataView, offset: number): string {
  return String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));
}
