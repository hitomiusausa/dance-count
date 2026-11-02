// 公開ビルド（dist/）の音楽の一式の番人（docs/app-store/RELEASE-PLAN.md §1-2）。tools/check-dist.js が呼ぶ。
// 一覧（music-catalog.json）が読め、一覧の指す音源がすべてあり、music/ に余りが無く、1 ファイルが配信の上限に収まること。
import fs from 'node:fs/promises';
import path from 'node:path';
import { MUSIC_CATALOG_FILE, musicPackFiles, parseMusicPackCatalog } from '../src/app/music/pack.ts';
import { TRIAL_TRACK_ID } from './music-library.ts';

// Cloudflare Workers Static Assets の 1 ファイルの上限は 25 MiB（wrangler.jsonc）。練習の音源（6 小節）はずっと小さい
export const MUSIC_FILE_MAX_BYTES = 25 * 1024 * 1024;

export async function checkMusicPack({ dist, files, required }: { dist: string; files: string[]; required: boolean }): Promise<{ problems: string[]; summary: string; files: string[] }> {
  const problems: string[] = [];
  const shipped = files.filter(file => file.startsWith('music/'));
  if (!files.includes(MUSIC_CATALOG_FILE)) {
    if (required) problems.push(`missing ${MUSIC_CATALOG_FILE}: build with DC_MUSIC_PACK=<folder made by npm run music:pack>`);
    for (const file of shipped) problems.push(`must not ship ${file} without ${MUSIC_CATALOG_FILE}`);
    return { problems, summary: 'music: none', files: [] };
  }
  let tracks;
  try {
    tracks = parseMusicPackCatalog(JSON.parse(await fs.readFile(path.join(dist, MUSIC_CATALOG_FILE), 'utf8')));
  } catch (error) {
    return { problems: [`${MUSIC_CATALOG_FILE} is invalid: ${(error as Error).message}`], summary: 'music: invalid', files: [] };
  }
  if (!tracks.length) problems.push(`${MUSIC_CATALOG_FILE} has no tracks`);
  if (tracks.some(track => track.id === TRIAL_TRACK_ID)) problems.push(`${MUSIC_CATALOG_FILE} must not include the trial track ${TRIAL_TRACK_ID}`);
  const expected = musicPackFiles(tracks);
  for (const file of expected) if (!shipped.includes(file)) problems.push(`music catalog lists ${file} but dist has no such file`);
  for (const file of shipped) if (!expected.includes(file)) problems.push(`must not ship ${file} (not in ${MUSIC_CATALOG_FILE})`);
  let bytes = 0;
  for (const file of shipped) {
    const size = (await fs.stat(path.join(dist, file))).size;
    bytes += size;
    if (size > MUSIC_FILE_MAX_BYTES) problems.push(`${file} is ${size} bytes > ${MUSIC_FILE_MAX_BYTES}`);
  }
  // 一覧に載っていて dist にある音源だけを、声の番人（checkDistAudio）の例外として返す
  return { problems, summary: `music ${tracks.length} tracks ${shipped.length} clips ${(bytes / 1024 / 1024).toFixed(1)} MB`, files: expected.filter(file => shipped.includes(file)) };
}
