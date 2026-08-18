// Renders the social preview card. Run with: npm run og
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const out = fileURLToPath(new URL('../demo/public/og.png', import.meta.url));

const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;900&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
    <style>
      :root { --ink:#16130e; --beam:#fff067; --pink:#ff9ad5; }
      * { box-sizing: border-box; margin: 0; }
      body {
        width: 1200px; height: 630px; background: #fff; color: var(--ink);
        font-family: Archivo, sans-serif; -webkit-font-smoothing: antialiased;
        display: flex; flex-direction: column; justify-content: space-between;
        padding: 64px 72px; position: relative;
      }
      body::after {
        content: ''; position: absolute; inset: 22px; border: 2px solid var(--ink); pointer-events: none;
      }
      .wordmark { font-weight: 900; font-size: 34px; letter-spacing: -0.02em; }
      .mark { background: var(--beam); padding: 0 4px; }
      .mark.alt { background: var(--pink); }
      h1 {
        font-weight: 900; font-size: 92px; line-height: 1.02; letter-spacing: -0.04em;
        max-width: 15ch;
      }
      .foot { display: flex; align-items: flex-end; justify-content: space-between; gap: 32px; }
      .meta { font: 500 22px 'IBM Plex Mono', monospace; color: #6b665c; line-height: 1.5; }
      .meta b { color: var(--ink); font-weight: 500; }
      .install {
        font: 500 24px 'IBM Plex Mono', monospace; border: 2px solid var(--ink);
        padding: 14px 20px; white-space: nowrap;
      }
    </style>
  </head>
  <body>
    <p class="wordmark">high<span class="mark">beam</span></p>
    <h1>Highlight anything on the page <span class="mark">without touching the DOM</span>.</h1>
    <div class="foot">
      <p class="meta">
        Built on the <b>CSS Custom Highlight API</b><br />
        Survives <span class="mark alt">React re-renders</span> · 2.4&#8202;kB · MIT
      </p>
      <p class="install">npm install highbeam</p>
    </div>
  </body>
</html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: out });
await browser.close();
console.log('wrote', out);
