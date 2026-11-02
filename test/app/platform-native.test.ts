import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { isNativeApp } from '../../src/app/platform/native.ts';
import { isStandalone } from '../../src/app/platform/pwa.ts';
import config from '../../capacitor.config.ts';

// App Store 版（Capacitor の iOS アプリ）の殻（docs/app-store/RELEASE-PLAN.md）。
const root = path.resolve(import.meta.dirname, '../..');

test('the web build is not treated as the native app', () => {
  assert.equal(isNativeApp(), false);
  assert.equal(isStandalone(), false, 'a browser tab stays a browser tab (the install card can still show)');
});

test('the iOS app ships the same dist that vite builds', async () => {
  const vite = await fs.readFile(path.join(root, 'vite.config.ts'), 'utf8');
  assert.match(vite, /base: '\.\/'/, 'relative asset paths are required inside the app');
  assert.match(vite, new RegExp(`outDir: '${config.webDir}'`));
});

test('the bundle ID is the same in capacitor.config.ts and the Xcode project', async () => {
  const project = await fs.readFile(path.join(root, 'ios/App/App.xcodeproj/project.pbxproj'), 'utf8');
  const ids = new Set([...project.matchAll(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/g)].map(match => match[1]));
  assert.deepEqual([...ids], [config.appId]);
  const families = new Set([...project.matchAll(/TARGETED_DEVICE_FAMILY = "([^"]+)";/g)].map(match => match[1]));
  assert.deepEqual([...families], ['1,2'], 'iPhone and iPad');
});

test('Info.plist declares the microphone purpose and the encryption answer', async () => {
  const plist = await fs.readFile(path.join(root, 'ios/App/App/Info.plist'), 'utf8');
  assert.match(plist, /<key>NSMicrophoneUsageDescription<\/key>\s*<string>[^<]{20,}<\/string>/, 'recording crashes without a purpose string');
  assert.match(plist, /<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/);
  assert.match(plist, /<key>CFBundleLocalizations<\/key>\s*<array>\s*<string>en<\/string>\s*<string>ja<\/string>/);
});
