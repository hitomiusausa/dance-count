import { useEffect, useState } from 'preact/hooks';
import { reloadPage } from './page.ts';

// ホーム画面のアプリ（PWA）の端末の面（段7・Ruling 88-4・90・92）。Service Worker の登録そのものは pwa-register.ts（virtual:pwa-register）で、
// ここは「新しい版があるか」「更新する」「どの端末か」「ホーム画面から開いているか」「Android の追加の案内（beforeinstallprompt）」だけ。
// 判断の部分（createPwaUpdater・platformKindFrom）は端末に触らない純粋な形にして Node でテストする。

export const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;   // ホーム画面のアプリは何日も生きるので、見えている間は 1 時間ごとに確かめる（Ruling 90-4）
export const UPDATE_WAIT_MS = 5000;                       // 新しすぎるファイルの「更新する」で新しい版を待つ上限（Ruling 90-5）
const UPDATE_POLL_MS = 100;

// ---- どの端末か（Ruling 92-1。S12 と S1 の案内カード） ----
export type PlatformKind = 'ios-safari' | 'ios-other' | 'android' | 'desktop';
const IOS = /\b(iPhone|iPad|iPod)\b/;
// iPhone の Safari 以外（Chrome・Firefox・Edge・Opera・Google アプリ・LINE などのアプリ内ブラウザ）。ここからはホーム画面に追加できない。
const IOS_OTHER = /\b(CriOS|FxiOS|EdgiOS|OPiOS|GSA|Line|FBAN|FBAV|Instagram)\//;

// iPadOS の Mac 風の UA（"Macintosh"）は desktop になる（Ruling 88-4 で許容）。
export function platformKindFrom(userAgent: string): PlatformKind {
  if (IOS.test(userAgent)) return /\bSafari\//.test(userAgent) && !IOS_OTHER.test(userAgent) ? 'ios-safari' : 'ios-other';
  if (/\bAndroid\b/.test(userAgent)) return 'android';
  return 'desktop';
}

export function platformKind(): PlatformKind {
  return platformKindFrom(typeof navigator === 'undefined' ? '' : navigator.userAgent);
}

// ホーム画面から開いているか（display-mode: standalone。古い iOS は navigator.standalone）。
export function isStandalone(): boolean {
  try {
    if (matchMedia('(display-mode: standalone)').matches) return true;
  } catch { /* matchMedia の無い環境 */ }
  return typeof navigator !== 'undefined' && (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

// ---- 新しい版（Ruling 90） ----
export interface PwaRegistrationLike { update(): Promise<unknown> }
export interface RegisterSwOptions {
  onNeedRefresh?: () => void;
  onRegisteredSW?: (swScriptUrl: string, registration: PwaRegistrationLike | undefined) => void;
  onRegisterError?: (error: unknown) => void;
}
// virtual:pwa-register の registerSW と同じ形。戻り値の updateServiceWorker は待っている新しい SW に SKIP_WAITING を送り、切り替わったら再読み込みする。
export type RegisterSw = (options: RegisterSwOptions) => (reloadPage?: boolean) => Promise<void>;
export interface PwaClock {
  now(): number;
  every(ms: number, run: () => void): void;
  onVisible(run: () => void): void;
  isVisible(): boolean;
  sleep(ms: number): Promise<void>;
}

export interface PwaUpdater {
  readonly updateReady: boolean;
  subscribe(listener: () => void): () => void;
  applyUpdate(): Promise<void>;
  checkForUpdateThenReload(): Promise<void>;
}

export function createPwaUpdater(register: RegisterSw, clock: PwaClock, reload: () => void): PwaUpdater {
  let ready = false;
  let registration: PwaRegistrationLike | undefined;
  let lastCheck = clock.now();
  const listeners = new Set<() => void>();
  const updateServiceWorker = register({
    onNeedRefresh() {
      ready = true;
      for (const listener of listeners) listener();
    },
    onRegisteredSW(_url, registered) { registration = registered; }
  });
  const check = async () => {
    if (!registration) return;
    lastCheck = clock.now();
    try { await registration.update(); } catch { /* 網が無い・サーバーが止まっている: 次の機会に */ }
  };
  const checkIfDue = () => {
    if (clock.isVisible() && clock.now() - lastCheck >= UPDATE_CHECK_INTERVAL_MS) void check();
  };
  clock.every(UPDATE_CHECK_INTERVAL_MS, checkIfDue);
  clock.onVisible(checkIfDue);
  return {
    get updateReady() { return ready; },
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    applyUpdate: () => updateServiceWorker(true),
    // 新しすぎるファイル（S10）の「更新する」: 待っている版があればそれへ。無ければ確かめて最大 5 秒待ち、来なければ再読み込み（網が無い・最新のまま）。
    async checkForUpdateThenReload() {
      if (ready) return updateServiceWorker(true);
      if (!registration) return reload();
      await check();
      const until = clock.now() + UPDATE_WAIT_MS;
      while (!ready && clock.now() < until) await clock.sleep(UPDATE_POLL_MS);
      if (ready) return updateServiceWorker(true);
      reload();
    }
  };
}

const browserClock: PwaClock = {
  now: () => Date.now(),
  every: (ms, run) => { setInterval(run, ms); },
  onVisible: run => document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') run(); }),
  isVisible: () => document.visibilityState === 'visible',
  sleep: ms => new Promise(resolve => setTimeout(resolve, ms))
};

let updater: PwaUpdater | null = null;

// 起動時に 1 回（pwa-register.ts が呼ぶ）。dev では SW が無いので登録だけで何も起きない。
export function startPwa(register: RegisterSw): void {
  if (!updater) updater = createPwaUpdater(register, browserClock, reloadPage);
}

// 更新の帯（UpdateBanner）が使う。?ui-state=update-ready は見た目だけ（押しても何もしない。Ruling 90-7）。
export function usePwaUpdate(uiState?: string): { updateReady: boolean; applyUpdate(): void } {
  const forced = uiState === 'update-ready';
  const [ready, setReady] = useState(() => updater?.updateReady ?? false);
  useEffect(() => updater?.subscribe(() => setReady(updater?.updateReady ?? false)), []);
  return { updateReady: forced || ready, applyUpdate: () => { if (!forced) void updater?.applyUpdate(); } };
}

// §11「新しいアプリで作られたファイル」の「更新する」（S10）。SW が無い時（dev・非対応）は今までどおり再読み込み。
export function checkForUpdateThenReload(): Promise<void> {
  if (!updater) {
    reloadPage();
    return Promise.resolve();
  }
  return updater.checkForUpdateThenReload();
}

// ---- Android の「ホーム画面に追加」（beforeinstallprompt。Chromium だけ。F38） ----
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
let deferredPrompt: InstallPromptEvent | null = null;
const installListeners = new Set<() => void>();
const notifyInstall = () => { for (const listener of installListeners) listener(); };

// main.tsx の最初で 1 回。ブラウザの既定の小さな帯は出さず、S12 のボタンから出す。
export function captureInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event as InstallPromptEvent;
    notifyInstall();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notifyInstall();
  });
}

export function useInstallPromptAvailable(): boolean {
  const [available, setAvailable] = useState(() => deferredPrompt !== null);
  useEffect(() => {
    const listener = () => setAvailable(deferredPrompt !== null);
    installListeners.add(listener);
    listener();
    return () => { installListeners.delete(listener); };
  }, []);
  return available;
}

// タップの処理の最初の文で呼ぶ（prompt() は利用者の操作の中でだけ出せる）。一度使ったイベントは使い直せない。
export function showInstallPrompt(): Promise<boolean> {
  const event = deferredPrompt;
  if (!event) return Promise.resolve(false);
  deferredPrompt = null;
  notifyInstall();
  try {
    return event.prompt().then(() => event.userChoice).then(choice => choice.outcome === 'accepted', () => false);
  } catch {
    return Promise.resolve(false);
  }
}
