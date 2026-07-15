import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const pages = [
  'public/practice.html',
  'public/routine-editor.html',
  'public/routine-migration-review.html',
  'public/six-comparison.html',
  'public/subdivision-audio-review.html',
  'public/voice-recorder.html',
  'public/voice-calibration.html'
];

for (const page of pages) {
  test(`${page} module scripts have valid JavaScript syntax`, async () => {
    const html = await readFile(page, 'utf8');
    const scripts = [...html.matchAll(/<script\s+type="module">([\s\S]*?)<\/script>/g)].map(match => match[1]);
    assert.ok(scripts.length > 0, `${page} has no module script`);
    for (const script of scripts) {
      const result = spawnSync(process.execPath, ['--check', '--input-type=module'], { input: script, encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
    }
  });
}
