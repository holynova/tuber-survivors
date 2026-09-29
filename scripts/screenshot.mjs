import { chromium } from 'playwright';

const URL = process.env.SHOT_URL || 'http://localhost:5173/';
const OUT = process.env.SHOT_OUT || 'screenshot.png';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));

await page.goto(URL, { waitUntil: 'load', timeout: 60000 });

await page.waitForFunction(() => {
  const canvas = document.querySelector('#game-canvas');
  const loadingHidden = document.querySelector('#loading')?.classList.contains('hidden');
  const titleVisible = !document.querySelector('#screen-title')?.classList.contains('hidden');
  return canvas && canvas.width > 0 && window.__game && loadingHidden && titleVisible;
}, { timeout: 60000 });

await page.waitForTimeout(4000);

const info = await page.evaluate(() => {
  const c = document.querySelector('#game-canvas');
  const gl = c.getContext('webgl2') || c.getContext('webgl');
  return { w: c.width, h: c.height, hasGL: !!gl, wave: window.__debug?.().wave };
});
console.log('canvas info:', JSON.stringify(info));

await page.screenshot({ path: OUT });
console.log('saved', OUT);
await browser.close();
