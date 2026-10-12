// 段7（Ruling 90-3・D45）: 更新の帯はルート・一覧の画面（S1・S3・S6・S7）だけ。集中画面（再生・録音・編集・配る・受け取る）には置かない
// ＝練習中に帯が出て再生を乱すことがない。画面のファイルの import で固定する（.tsx のテストは書かない方針なのでソースを読む）。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const screens = path.resolve(import.meta.dirname, '../../src/app/screens');

test('only S1, S3, S6 and S7 show the update banner (never a focus screen)', () => {
  const withBanner = fs.readdirSync(screens).filter(file => fs.readFileSync(path.join(screens, file), 'utf8').includes('<UpdateBanner />')).sort();
  assert.deepEqual(withBanner, ['HomeScreen.tsx', 'RoutinesScreen.tsx', 'SettingsScreen.tsx', 'VoicesScreen.tsx']);
});
