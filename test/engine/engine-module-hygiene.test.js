import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { loadVoicePack } from '../../src/engine/voice-pack-loader.js';

const engineDir = path.resolve(import.meta.dirname, '../../src/engine');

test('engine modules import each other without ?v= cache busters (one module instance each)', async () => {
  const files = (await fs.readdir(engineDir)).filter(name => name.endsWith('.js'));
  assert.ok(files.length >= 23, `expected the moved engine modules, found ${files.length}`);
  for (const file of files) {
    const source = await fs.readFile(path.join(engineDir, file), 'utf8');
    const specifiers = [...source.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map(match => match[1]);
    for (const specifier of specifiers) {
      assert.ok(!specifier.includes('?'), `${file} imports "${specifier}" with a query string`);
    }
  }
});

test('voice pack loader leaves the HTTP cache policy to the injected fetch', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).endsWith('manifest.json')) {
      return { ok: true, json: async () => ({ schemaVersion: 2, id: 'p', words: { one: { file: 'one.wav', onsetMs: 1 } } }) };
    }
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(1) };
  };
  await loadVoicePack({ decodeAudioData: async () => ({ duration: 1 }) }, 'https://example.test/a/manifest.json', fetchImpl);
  assert.equal(calls.length, 2);
  for (const call of calls) assert.equal(call.init, undefined, `${call.url} was fetched with ${JSON.stringify(call.init)}`);
});
