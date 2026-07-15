#!/usr/bin/env node
import { chromium } from 'playwright-core';

const BASE = process.env.DC_BASE_URL ?? 'http://localhost:4173/public/';
const PAGES = ['practice.html', 'routine-editor.html'];
const VIEWPORTS = [{ name: 'mobile', width: 390, height: 844 }, { name: 'desktop', width: 1280, height: 900 }];
const MIN_TAP = 44;
const MIN_CONTRAST = 4.5;

const browser = await chromium.launch({ channel: 'chrome' }).catch(error => {
  console.error('Google Chrome を起動できませんでした。Chromeのインストールとサーバー(npm start)を確認してください。');
  console.error(error.message);
  process.exit(2);
});

let violations = 0;

for (const pageName of PAGES) {
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', error => consoleErrors.push(error.message));
    await page.goto(BASE + pageName, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const found = await page.evaluate(({ MIN_TAP, MIN_CONTRAST }) => {
      window.scrollTo(0, 0);
      const issues = [];

      // 0) 固定バーの位置
      for (const bar of document.querySelectorAll('.dc-bar')) {
        const rect = bar.getBoundingClientRect();
        if (Math.abs(rect.bottom - innerHeight) > 2) {
          issues.push(`BAR-POSITION bottom=${Math.round(rect.bottom)} viewport=${innerHeight} ${bar.tagName.toLowerCase()}${bar.id ? `#${bar.id}` : ''}.${[...bar.classList].join('.')}`);
        }
      }

      const visible = element => {
        const style = getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || element.closest('[hidden]')) return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };
      const describe = element => `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}.${[...element.classList].join('.')} "${(element.textContent ?? '').trim().slice(0, 24)}"`;

      // 1) タッチ目標
      for (const element of document.querySelectorAll('button, select, summary, a, input:not([type="hidden"])')) {
        if (!visible(element)) continue;
        if (element.closest('.dc-toggle') && element.tagName === 'INPUT') continue; // トグルはlabel全体が目標
        const rect = element.getBoundingClientRect();
        const effective = element.closest('label.dc-toggle')?.getBoundingClientRect() ?? rect;
        if (effective.height < MIN_TAP - 0.5 || effective.width < MIN_TAP - 0.5) {
          issues.push(`TAP ${Math.round(effective.width)}x${Math.round(effective.height)} ${describe(element)}`);
        }
      }

      // 2) コントラスト
      const linear = channel => { const c = channel / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
      const luminance = rgb => 0.2126 * linear(rgb[0]) + 0.7152 * linear(rgb[1]) + 0.0722 * linear(rgb[2]);
      const parse = value => { const match = value.match(/rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?\)/); return match ? { rgb: [+match[1], +match[2], +match[3]], alpha: match[4] === undefined ? 1 : +match[4] } : null; };
      const effectiveBackground = element => {
        for (let node = element; node; node = node.parentElement) {
          const parsed = parse(getComputedStyle(node).backgroundColor);
          if (parsed && parsed.alpha >= 0.9) return parsed.rgb;
        }
        return [255, 255, 255];
      };
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const checked = new Set();
      while (walker.nextNode()) {
        const element = walker.currentNode.parentElement;
        if (!element || checked.has(element) || !walker.currentNode.textContent.trim()) continue;
        checked.add(element);
        if (!visible(element) || element.closest('[aria-hidden="true"]')) continue;
        if (element.closest('button:disabled, [disabled], option')) continue;
        const color = parse(getComputedStyle(element).color);
        if (!color) continue;
        const background = effectiveBackground(element);
        const light = Math.max(luminance(color.rgb), luminance(background));
        const dark = Math.min(luminance(color.rgb), luminance(background));
        const ratio = (light + 0.05) / (dark + 0.05);
        if (ratio < MIN_CONTRAST) issues.push(`CONTRAST ${ratio.toFixed(2)} ${describe(element)}`);
      }
      return issues;
    }, { MIN_TAP, MIN_CONTRAST });

    const problems = [...found, ...consoleErrors.map(text => `CONSOLE ${text}`)];
    console.log(`\n== ${pageName} @ ${viewport.name} : ${problems.length ? `${problems.length} 件の違反` : 'PASS'}`);
    for (const problem of problems) console.log('  ' + problem);
    violations += problems.length;
    await context.close();
  }
}

await browser.close();
process.exit(violations ? 1 : 0);
