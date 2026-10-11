// Google Cloud Text-to-Speech（有料・従量課金）。認証は ADC（gcloud auth application-default login）だけ。
// API キー・サービスアカウント鍵の経路は作らない（Ruling 65-3）。fetch と getToken は注入できる（テストで本物を呼ばない）。
import { execFileSync } from 'node:child_process';
import { parsePcm16Wav } from '../wav.js';

export const GOOGLE_TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';
export const GOOGLE_SAMPLE_RATE = 48_000;

export function adcAccessToken() {
  if (process.env.GOOGLE_TTS_ACCESS_TOKEN) return process.env.GOOGLE_TTS_ACCESS_TOKEN;   // CI 用（使わない）
  try {
    return execFileSync('gcloud', ['auth', 'application-default', 'print-access-token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    throw new Error('Google の認証がありません。ターミナルで gcloud auth application-default login を実行してください（API キーは作らない）');
  }
}

export function gcloudProject() {
  if (process.env.GOOGLE_CLOUD_QUOTA_PROJECT) return process.env.GOOGLE_CLOUD_QUOTA_PROJECT;
  if (process.env.GOOGLE_CLOUD_PROJECT) return process.env.GOOGLE_CLOUD_PROJECT;
  try {
    return execFileSync('gcloud', ['config', 'get-value', 'project'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

export function googleRequestBody({ text, ssml, voice, lang, rate }) {
  return {
    input: ssml ? { ssml } : { text },
    voice: { languageCode: lang, name: voice },
    audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: GOOGLE_SAMPLE_RATE, speakingRate: rate }
  };
}

export function createGoogleProvider({ voice, lang, rate, fetch = globalThis.fetch, getToken = adcAccessToken, getProject = gcloudProject, allowPaid = false }) {
  let token;
  let project;
  return {
    id: 'google',
    paid: true,
    describe: () => ({ provider: 'google-cloud-tts', name: `Google ${voice}`, voiceName: voice }),
    async synthesize({ key, text, ssml }) {
      if (!allowPaid) throw new Error('Google は有料です。--yes と VOICES_ALLOW_PAID=1 の両方が要ります');
      token ??= getToken();
      project ??= getProject();
      const response = await fetch(GOOGLE_TTS_URL, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json; charset=utf-8',
          ...(project ? { 'x-goog-user-project': project } : {})
        },
        body: JSON.stringify(googleRequestBody({ text, ssml, voice, lang, rate }))
      });
      if (!response.ok) throw new Error(`Google TTS failed for ${key}: ${response.status} ${await response.text()}`);
      const body = await response.json();
      const wav = parsePcm16Wav(Buffer.from(body.audioContent, 'base64'));
      return { pcm: wav.samples, sampleRate: wav.sampleRate, meta: { voice, lang, rate } };
    }
  };
}
