import { PlatformNotReadyError } from './not-ready.ts';

// MediaRecorder（iOS audio/mp4・Chrome audio/webm;codecs=opus）→ WAV 化は段4（仕様 §7・Ruling 15）。
export interface WordRecording { blob: Blob; mimeType: string }

export async function recordWord(_durationMs: number): Promise<WordRecording> {
  throw new PlatformNotReadyError('voice recording', 4);
}
