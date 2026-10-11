export function measureOnset(samples, sampleRate, options = {}) {
  const windowMs = options.windowMs ?? 5;
  const sustainMs = options.sustainMs ?? 15;
  const relativeThreshold = options.relativeThreshold ?? 0.035;
  const absoluteThreshold = options.absoluteThreshold ?? 0.002;
  const windowSize = Math.max(1, Math.round(sampleRate * windowMs / 1000));
  const sustainWindows = Math.max(1, Math.ceil(sustainMs / windowMs));
  const rms = [];
  let peakRms = 0;

  for (let start = 0; start < samples.length; start += windowSize) {
    const end = Math.min(samples.length, start + windowSize);
    let sumSquares = 0;
    for (let index = start; index < end; index += 1) sumSquares += samples[index] ** 2;
    const value = Math.sqrt(sumSquares / (end - start));
    rms.push(value);
    peakRms = Math.max(peakRms, value);
  }

  const threshold = Math.max(absoluteThreshold, peakRms * relativeThreshold);
  for (let index = 0; index <= rms.length - sustainWindows; index += 1) {
    if (rms.slice(index, index + sustainWindows).every(value => value >= threshold)) {
      return { onsetMs: Math.round(index * windowSize / sampleRate * 1000), threshold, peakRms };
    }
  }
  throw new Error('No sustained voice onset detected');
}

export function mixAudioBufferToMono(audioBuffer) {
  const samples = new Float32Array(audioBuffer.length);
  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel += 1) {
    const data = audioBuffer.getChannelData(channel);
    for (let index = 0; index < data.length; index += 1) samples[index] += data[index] / audioBuffer.numberOfChannels;
  }
  return samples;
}
