export class VoicePackError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'VoicePackError';
    this.details = details;
  }
}

export async function loadVoicePack(audioContext, manifestUrl, fetchImpl = fetch) {
  const response = await fetchImpl(manifestUrl, { cache: 'no-store' });
  if (!response.ok) throw new VoicePackError(`Could not load voice manifest: ${response.status}`);
  const manifest = await response.json();
  validateManifest(manifest);
  const baseUrl = new URL('.', manifestUrl);
  const words = new Map();

  const decodedWords = await Promise.all(Object.entries(manifest.words).map(async ([key, item]) => {
    const audioUrl = new URL(item.file, baseUrl);
    if (item.revision) audioUrl.searchParams.set('v', item.revision);
    const audioResponse = await fetchImpl(audioUrl, { cache: 'no-store' });
    if (!audioResponse.ok) throw new VoicePackError(`Could not load voice file: ${item.file}`);
    const buffer = await audioContext.decodeAudioData(await audioResponse.arrayBuffer());
    if (item.onsetMs / 1000 >= buffer.duration) {
      throw new VoicePackError(`onsetMs exceeds audio duration: ${key}`);
    }
    return [key, { ...item, buffer }];
  }));
  for (const [key, word] of decodedWords) words.set(key, word);

  return { manifest, words };
}

export function scheduleVoiceEvent({
  audioContext,
  destination = audioContext.destination,
  voicePack,
  event,
  targetTime,
  userOffsetMs = 0,
  endTime = null,
  fadeOutSeconds = 0.012
}) {
  if (!event.voiceKey) return null;
  const word = voicePack.words.get(event.voiceKey);
  if (!word) throw new VoicePackError(`Voice is missing: ${event.voiceKey}`);
  const source = audioContext.createBufferSource();
  const gain = audioContext.createGain();
  source.buffer = word.buffer;
  gain.gain.value = 10 ** ((word.gainDb ?? 0) / 20);
  source.connect(gain).connect(destination);
  const startTime = targetTime - word.onsetMs / 1000 + userOffsetMs / 1000;
  const scheduledTime = Math.max(audioContext.currentTime, startTime);
  const bufferOffset = Math.max(0, audioContext.currentTime - startTime);
  if (bufferOffset >= word.buffer.duration) return null;
  if (Number.isFinite(endTime) && endTime <= scheduledTime) return null;
  if (Number.isFinite(endTime)) {
    const fadeStartTime = Math.max(scheduledTime, endTime - fadeOutSeconds);
    gain.gain.setValueAtTime?.(gain.gain.value, fadeStartTime);
    gain.gain.linearRampToValueAtTime?.(0, endTime);
  }
  source.start(scheduledTime, bufferOffset);
  if (Number.isFinite(endTime)) source.stop?.(endTime);
  return source;
}

export function validateManifest(manifest) {
  if (manifest?.schemaVersion !== 2) throw new VoicePackError('Unsupported voice manifest version');
  if (!manifest.id || !manifest.words || typeof manifest.words !== 'object') {
    throw new VoicePackError('Invalid voice manifest');
  }
  for (const [key, item] of Object.entries(manifest.words)) {
    if (!item.file || !Number.isFinite(item.onsetMs) || item.onsetMs < 0) {
      throw new VoicePackError(`Invalid voice entry: ${key}`);
    }
  }
  return true;
}
