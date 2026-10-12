// 段7（Ruling 88-4・90・92-1・95-1）: どの端末か・ホーム画面から開いているか・新しい版の確かめ方と「更新する」の 3 分岐。
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  UPDATE_CHECK_INTERVAL_MS, UPDATE_WAIT_MS, createPwaUpdater, createUpdateReadyHub, isStandalone, platformKindFrom,
  type PwaClock, type PwaRegistrationLike, type RegisterSwOptions
} from '../../src/app/platform/pwa.ts';

const UA = {
  iosSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Mobile/15E148 Safari/604.1',
  iosChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.7390.41 Mobile/15E148 Safari/604.1',
  iosFirefox: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/143.0 Mobile/15E148 Safari/605.1.15',
  iosLine: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/26.3.0',
  androidChrome: 'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
  macChrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  iPadDesktop: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Safari/605.1.15'
};

test('the platform decides which one way S12 shows (Ruling 92-1)', () => {
  assert.equal(platformKindFrom(UA.iosSafari), 'ios-safari');
  assert.equal(platformKindFrom(UA.iosChrome), 'ios-other');
  assert.equal(platformKindFrom(UA.iosFirefox), 'ios-other');
  assert.equal(platformKindFrom(UA.iosLine), 'ios-other', 'LINE has no "Safari/" and cannot add to the Home Screen');
  assert.equal(platformKindFrom(UA.androidChrome), 'android');
  assert.equal(platformKindFrom(UA.macChrome), 'desktop');
  assert.equal(platformKindFrom(UA.iPadDesktop), 'desktop', 'iPadOS with the Mac-like UA is treated as a PC (Ruling 88-4)');
  assert.equal(platformKindFrom(''), 'desktop');
});

test('standalone is display-mode: standalone or the old navigator.standalone', t => {
  assert.equal(isStandalone(), false, 'Node has no matchMedia');
  const g = globalThis as { matchMedia?: unknown };
  g.matchMedia = (query: string) => ({ matches: query === '(display-mode: standalone)' });
  t.after(() => { delete g.matchMedia; });
  assert.equal(isStandalone(), true);
  g.matchMedia = () => ({ matches: false });
  assert.equal(isStandalone(), false);
});

function fakeClock() {
  let now = 0;
  let visible = true;
  const timers: Array<() => void> = [];
  const visibles: Array<() => void> = [];
  const clock: PwaClock = {
    now: () => now,
    every: (_ms, run) => { timers.push(run); },
    onVisible: run => { visibles.push(run); },
    isVisible: () => visible,
    sleep: async ms => { now += ms; }
  };
  return {
    clock,
    advance(ms: number) { now += ms; },
    tick() { for (const run of timers) run(); },
    show() { visible = true; for (const run of visibles) run(); },
    hide() { visible = false; }
  };
}

function fakeRegister({ refreshOnUpdate = false, registered = true } = {}) {
  const calls = { update: 0, apply: [] as Array<boolean | undefined> };
  let options: RegisterSwOptions = {};
  const registration: PwaRegistrationLike = {
    update: async () => {
      calls.update += 1;
      if (refreshOnUpdate) options.onNeedRefresh?.();
    }
  };
  const register = (given: RegisterSwOptions) => {
    options = given;
    if (registered) given.onRegisteredSW?.('./sw.js', registration);
    return async (reload?: boolean) => { calls.apply.push(reload); };
  };
  return { register, calls, needRefresh: () => options.onNeedRefresh?.() };
}

test('a waiting new version makes updateReady true and tells the subscribers (Ruling 90-1)', () => {
  const sw = fakeRegister();
  const updater = createPwaUpdater(sw.register, fakeClock().clock, () => assert.fail('no reload'));
  let told = 0;
  const unsubscribe = updater.subscribe(() => { told += 1; });
  assert.equal(updater.updateReady, false);
  sw.needRefresh();
  assert.equal(updater.updateReady, true);
  assert.equal(told, 1);
  unsubscribe();
  sw.needRefresh();
  assert.equal(told, 1);
});

test('"Update" on the banner switches to the waiting version (no automatic reload)', async () => {
  const sw = fakeRegister();
  const updater = createPwaUpdater(sw.register, fakeClock().clock, () => assert.fail('no reload'));
  sw.needRefresh();
  await updater.applyUpdate();
  assert.deepEqual(sw.calls.apply, [true]);
});

test('"Update" for a too-new file: waiting version → switch; found within 5 s → switch; none → reload (Ruling 90-5)', async () => {
  const ready = fakeRegister();
  const first = createPwaUpdater(ready.register, fakeClock().clock, () => assert.fail('no reload'));
  ready.needRefresh();
  await first.checkForUpdateThenReload();
  assert.deepEqual(ready.calls.apply, [true]);
  assert.equal(ready.calls.update, 0);

  const found = fakeRegister({ refreshOnUpdate: true });
  const second = createPwaUpdater(found.register, fakeClock().clock, () => assert.fail('no reload'));
  await second.checkForUpdateThenReload();
  assert.equal(found.calls.update, 1);
  assert.deepEqual(found.calls.apply, [true]);

  const none = fakeRegister();
  const time = fakeClock();
  let reloads = 0;
  const third = createPwaUpdater(none.register, time.clock, () => { reloads += 1; });
  const started = time.clock.now();
  await third.checkForUpdateThenReload();
  assert.equal(reloads, 1);
  assert.deepEqual(none.calls.apply, []);
  assert.ok(time.clock.now() - started >= UPDATE_WAIT_MS && time.clock.now() - started < UPDATE_WAIT_MS + 1000);

  const unregistered = fakeRegister({ registered: false });
  let plainReloads = 0;
  await createPwaUpdater(unregistered.register, fakeClock().clock, () => { plainReloads += 1; }).checkForUpdateThenReload();
  assert.equal(plainReloads, 1, 'no service worker (dev, unsupported): reload as before');
});

test('the app checks for a new version every hour while visible and on coming back after an hour (Ruling 90-4)', () => {
  const sw = fakeRegister();
  const time = fakeClock();
  createPwaUpdater(sw.register, time.clock, () => {});
  time.advance(UPDATE_CHECK_INTERVAL_MS - 1);
  time.tick();
  time.show();
  assert.equal(sw.calls.update, 0, 'not yet an hour');
  time.advance(1);
  time.hide();
  time.tick();
  assert.equal(sw.calls.update, 0, 'hidden: wait until it is seen again');
  time.show();
  assert.equal(sw.calls.update, 1, 'shown again after an hour: check at once');
  time.show();
  assert.equal(sw.calls.update, 1, 'just checked');
  time.advance(UPDATE_CHECK_INTERVAL_MS);
  time.tick();
  assert.equal(sw.calls.update, 2);
});

test('the banner reads the current state when it subscribes, whatever came first (stage-7 review M3)', () => {
  // 1. 新しい版が描画と購読のあいだに来た: 購読した時にすぐ true を受け取る
  const early = fakeRegister();
  const earlyHub = createUpdateReadyHub();
  earlyHub.attach(createPwaUpdater(early.register, fakeClock().clock, () => assert.fail('no reload')));
  assert.equal(earlyHub.current(), false, 'the first render sees no update');
  early.needRefresh();
  const seen: boolean[] = [];
  const stop = earlyHub.subscribe(ready => seen.push(ready));
  assert.deepEqual(seen, [true]);
  stop();

  // 2. 帯が先に購読し、更新係が後から来る（main.tsx は描画の後に登録する）: 後から来た版も知らされる
  const late = fakeRegister();
  const lateHub = createUpdateReadyHub();
  const told: boolean[] = [];
  lateHub.subscribe(ready => told.push(ready));
  lateHub.attach(createPwaUpdater(late.register, fakeClock().clock, () => assert.fail('no reload')));
  late.needRefresh();
  assert.deepEqual(told, [false, false, true]);
  assert.equal(lateHub.current(), true);
});
