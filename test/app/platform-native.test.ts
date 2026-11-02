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

// iPhone は縦だけ（ひとみうさ 2026-11-02）。iPad は 4 方向のまま（画面の分割＝マルチタスクには 4 方向が要る）。
test('iPhone is portrait only and iPad keeps all four orientations', async () => {
  const plist = await fs.readFile(path.join(root, 'ios/App/App/Info.plist'), 'utf8');
  const orientations = (key: string) => {
    const block = plist.match(new RegExp(`<key>${key}</key>\\s*<array>([\\s\\S]*?)</array>`));
    assert.ok(block, key);
    return [...block[1].matchAll(/<string>([^<]+)<\/string>/g)].map(match => match[1]);
  };
  assert.deepEqual(orientations('UISupportedInterfaceOrientations'), ['UIInterfaceOrientationPortrait']);
  assert.equal(orientations('UISupportedInterfaceOrientations~ipad').length, 4);
});

// iOS アプリは画面が時計・切り欠きの裏まで広がる（viewport-fit=cover・contentInset never）。上の安全領域のぶん下げ、帯で隠す。
// アプリはライトの色だけなので、時計などの文字が背景に溶けないよう、いつもライト（uchikare と同じ）。
test('the app keeps content out of the notch and stays in light appearance', async () => {
  const css = await fs.readFile(path.join(root, 'src/app/styles/base.css'), 'utf8');
  assert.match(css, /\.dc-shell \{[^}]*padding-top: env\(safe-area-inset-top\)/);
  assert.match(css, /\.dc-shell::before \{[^}]*position: fixed;[^}]*height: env\(safe-area-inset-top\)/);
  const html = await fs.readFile(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /viewport-fit=cover/);
  const plist = await fs.readFile(path.join(root, 'ios/App/App/Info.plist'), 'utf8');
  assert.match(plist, /<key>UIUserInterfaceStyle<\/key>\s*<string>Light<\/string>/);
});

// App Store の決まりと、起動から最初の画面までの色のつながり（docs/app-store/RELEASE-PLAN.md）
test('the iOS icon is a 1024 square without transparency (tools/make-icons.js)', async () => {
  const png = await fs.readFile(path.join(root, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'));
  assert.equal(png.readUInt32BE(16), 1024);
  assert.equal(png.readUInt32BE(20), 1024);
  assert.equal(png[25], 2, 'PNG colour type 2 = RGB without alpha (App Store rejects transparent icons)');
  const contents = JSON.parse(await fs.readFile(path.join(root, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json'), 'utf8'));
  assert.ok(contents.images.some((image: { filename?: string; size?: string }) => image.filename === 'AppIcon-512@2x.png' && image.size === '1024x1024'));
});

test('the launch screen is the same navy as the boot shell and the web view background', async () => {
  const plist = await fs.readFile(path.join(root, 'ios/App/App/Info.plist'), 'utf8');
  assert.match(plist, /<key>UILaunchScreen<\/key>\s*<dict>\s*<key>UIColorName<\/key>\s*<string>LaunchBackground<\/string>/);
  assert.doesNotMatch(plist, /UILaunchStoryboardName/);
  const color = JSON.parse(await fs.readFile(path.join(root, 'ios/App/App/Assets.xcassets/LaunchBackground.colorset/Contents.json'), 'utf8')).colors[0].color.components;
  const hex = `#${[color.red, color.green, color.blue].map((value: string) => Number(value).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
  const html = await fs.readFile(path.join(root, 'index.html'), 'utf8');
  assert.match(html, new RegExp(`\\.dc-boot\\{[^}]*background:${hex}`, 'i'));
  assert.equal(config.ios?.backgroundColor?.toUpperCase(), hex);
});

test('the privacy manifest and the Japanese microphone text ship in the app', async () => {
  const project = await fs.readFile(path.join(root, 'ios/App/App.xcodeproj/project.pbxproj'), 'utf8');
  assert.match(project, /\/\* PrivacyInfo\.xcprivacy in Resources \*\/,/);
  assert.match(project, /\/\* InfoPlist\.strings in Resources \*\/,/);
  assert.match(project, /path = ja\.lproj\/InfoPlist\.strings;/);
  assert.match(project, /knownRegions = \(\s*en,\s*ja,/);
  const manifest = await fs.readFile(path.join(root, 'ios/App/App/PrivacyInfo.xcprivacy'), 'utf8');
  assert.match(manifest, /<key>NSPrivacyTracking<\/key>\s*<false\/>/);
  assert.match(manifest, /<key>NSPrivacyCollectedDataTypes<\/key>\s*<array\/>/);
  const strings = await fs.readFile(path.join(root, 'ios/App/App/ja.lproj/InfoPlist.strings'), 'utf8');
  assert.match(strings, /^"NSMicrophoneUsageDescription" = "[^"]{10,}";$/m);
});
