// timing:audit の出力を移設前の基準と比べる。generatedAt だけを除いて完全一致でなければ終了コード1。
// 使い方: npm run timing:audit && npm run timing:compare
import fs from 'node:fs/promises';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';

const root = path.resolve(import.meta.dirname, '..');
const [beforePath, afterPath] = [
  process.argv[2] ?? 'output/timing-audit-before.json',
  process.argv[3] ?? 'output/all-dance-timing-audit.json'
].map(file => path.resolve(root, file));

const strip = async file => {
  const { generatedAt, ...rest } = JSON.parse(await fs.readFile(file, 'utf8'));
  return rest;
};
const [before, after] = await Promise.all([strip(beforePath), strip(afterPath)]);
if (!isDeepStrictEqual(before, after)) {
  console.error(`timing audit differs: ${path.relative(root, beforePath)} vs ${path.relative(root, afterPath)}`);
  process.exit(1);
}
console.log('timing audit identical (generatedAt excluded)');
