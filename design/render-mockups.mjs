/**
 * Renders design/Proofly Colour Mockups.html to design/mockups/*.png.
 *
 *   npm run mockups      (from the repo root)
 *
 * The mockups file is a self-unpacking bundle: each screen only exists once
 * its script has written it into an iframe, so this needs a real browser
 * rather than a static converter. Kept in the repo so the PNGs can be
 * regenerated from their source instead of being binaries nobody can rebuild.
 */
import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const SOURCE = resolve('design/Proofly Colour Mockups.html');
const OUT = resolve('design/mockups');

// Filenames the Day 5 and Day 6 prompts reference.
const NAMES = {
  'Dashboard · desktop': 'desktop-1-dashboard.png',
  'Purchase details · desktop': 'desktop-2-purchase-details.png',
  'Add purchase · desktop': 'desktop-3-add-purchase.png',
  'Dashboard · mobile': 'mobile-1-dashboard.png',
  'Purchase details · mobile': 'mobile-2-purchase-details.png',
};

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1500, height: 1200 } });

await page.goto(pathToFileURL(SOURCE).href, { waitUntil: 'load' });

// The file is a self-unpacking bundle: the boards only exist once its script
// has written each screen into an iframe. Those iframes end up on blob: URLs,
// which are an opaque origin, so contentDocument is null from the page's own
// context — the frames have to be reached through Playwright's frame API.
await page.waitForSelector('section.board iframe', { timeout: 30_000 });
await page.waitForFunction(() => document.querySelectorAll('section.board iframe').length === 5, undefined, {
  timeout: 30_000,
});

for (const frame of page.frames().slice(1)) {
  await frame.waitForSelector('body *', { timeout: 30_000 });
}
await page.waitForTimeout(2000); // webfonts

const boards = await page.$$('section.board');
console.log(`boards found: ${boards.length}`);

for (const board of boards) {
  const title = (await board.$eval('h2', (h) => h.textContent?.trim() ?? '')) || 'untitled';
  const file = NAMES[title];
  if (!file) {
    console.log(`  skipped (no mapping): ${title}`);
    continue;
  }
  const handle = await board.$('iframe');

  // A board far down the page can still be unpainted when its turn comes, so
  // bring it into view and let it settle before capturing. The mobile
  // dashboard came out blank without this.
  await handle.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);

  const frame = await handle.contentFrame();
  const elements = await frame.evaluate(() => document.body.querySelectorAll('*').length);
  if (elements < 5) throw new Error(`${title}: frame has only ${elements} elements — it did not render`);

  await handle.screenshot({ path: resolve(OUT, file) });
  const box = await handle.boundingBox();
  console.log(
    `  ${file.padEnd(32)} ${Math.round(box.width)}x${Math.round(box.height)}`.padEnd(48) +
      `${elements} elements  ${title}`,
  );
}

await browser.close();
