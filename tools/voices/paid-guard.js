// 有料 API（Google Cloud TTS）を呼ぶスクリプトの共通の鍵（Ruling 65-2・段6a 修正便 I-1）。
// 1) --yes と環境変数 VOICES_ALLOW_PAID=1 の両方が無ければ、何をするかを表示して終わる（exit 0）。
// 2) 出荷中の音（public/audio/ の下）に書く時は、さらに --overwrite-shipped が要る。
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
export const SHIPPED_AUDIO_ROOT = path.join(root, 'public/audio');
export const OVERWRITE_SHIPPED_FLAG = '--overwrite-shipped';

export function isShippedAudioDir(dir) {
  const relative = path.relative(SHIPPED_AUDIO_ROOT, path.resolve(dir));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function paidKeysPresent(argv, env) {
  return argv.includes('--yes') && env.VOICES_ALLOW_PAID === '1';
}

/** 返り値: { proceed: true } か { proceed: false, mode: 'plan'|'refused', exitCode } */
export function checkPaidRun({ argv, env, outputDir, log }) {
  const shipped = isShippedAudioDir(outputDir);
  if (!paidKeysPresent(argv, env)) {
    log('（実行していません: 有料の Google を呼ぶには --yes と環境変数 VOICES_ALLOW_PAID=1 の両方が要ります）');
    if (shipped) log(`（出力先は出荷中の音です。書き直すには ${OVERWRITE_SHIPPED_FLAG} も要ります）`);
    return { proceed: false, mode: 'plan', exitCode: 0 };
  }
  if (shipped && !argv.includes(OVERWRITE_SHIPPED_FLAG)) {
    log(`止めました: 出力先 ${path.relative(root, outputDir)} は出荷中の音です。書き直すなら ${OVERWRITE_SHIPPED_FLAG} を付けてください（別の場所なら VOICE_OUTPUT_DIR）。`);
    return { proceed: false, mode: 'refused', exitCode: 2 };
  }
  return { proceed: true };
}
