import { createRequire } from 'module';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const puppeteer = require('C:/Users/Chris/AppData/Roaming/npm/node_modules/puppeteer/lib/cjs/puppeteer/puppeteer.js');

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const screenshotDir = join(__dirname, 'temporary screenshots');

if (!existsSync(screenshotDir)) mkdirSync(screenshotDir, { recursive: true });

const url   = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] ? `-${process.argv[3]}` : '';

const existing = existsSync(screenshotDir)
  ? readdirSync(screenshotDir).filter(f => f.startsWith('screenshot-')).length
  : 0;
const filename = `screenshot-${existing + 1}${label}.png`;
const outPath  = join(screenshotDir, filename);

// Find Chrome
const { readdirSync: rds } = await import('fs');
const cacheBase = 'C:/Users/Chris/.cache/puppeteer/chrome/';
const versions  = rds(cacheBase);
const version   = versions[0];
const executablePath = `C:/Users/Chris/.cache/puppeteer/chrome/${version}/chrome-win64/chrome.exe`;

const browser = await puppeteer.launch({
  executablePath,
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

// Scroll through the page to trigger all ScrollTrigger animations
await page.evaluate(async () => {
  const totalHeight = document.body.scrollHeight;
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    window.scrollTo(0, (totalHeight / steps) * i);
    await new Promise(r => setTimeout(r, 80));
  }
});
await new Promise(r => setTimeout(r, 400));

// Force-complete all GSAP animations, then scroll to top
await page.evaluate(() => {
  if (window.gsap) {
    gsap.globalTimeline.progress(1, true);
    gsap.globalTimeline.pause();
    // Also complete any ScrollTrigger-managed animations
    if (window.ScrollTrigger) {
      ScrollTrigger.getAll().forEach(st => {
        if (st.animation) st.animation.progress(1, true);
      });
    }
  }
  window.scrollTo(0, 0);
});
await new Promise(r => setTimeout(r, 600));

await page.screenshot({ path: outPath, fullPage: true });
await browser.close();

console.log(`Screenshot saved: temporary screenshots/${filename}`);
