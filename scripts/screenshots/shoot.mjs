// Full-page screenshots of every root page, two widths, deterministic.
//
//   node shoot.mjs <label> [--only index,about] [--widths 390,1440] [--root dir]
//
// Writes _shots/<label>/<page>-<width>.png at the repo root. Serves the
// repo over HTTP itself (partials and fetch() need a server).

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PORT = 8731;
const args = process.argv.slice(2);
const label = args.find((a) => !a.startsWith('--'));
if (!label) {
  console.error('usage: node shoot.mjs <label> [--only a,b] [--widths 390,1440]');
  process.exit(1);
}
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const widths = opt('widths', '390,1440').split(',').map(Number);
// --root serves another copy of the site (e.g. a git archive of an older commit).
const ROOT = path.resolve(opt('root', REPO));
const only = opt('only', '') ? opt('only', '').split(',') : null;

// Freeze everything that moves or differs between runs.
const FREEZE_CSS = `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
  }
  html { scroll-behavior: auto !important; }
  video { visibility: hidden !important; }
  .fd-tune { display: none !important; }
`;

async function listPages() {
  const files = await readdir(ROOT);
  return files
    .filter((f) => f.endsWith('.html'))
    .map((f) => f.replace(/\.html$/, ''))
    .filter((p) => !only || only.includes(p))
    .sort();
}

function startServer() {
  const proc = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
    cwd: ROOT,
    stdio: 'ignore',
  });
  return proc;
}

async function waitForServer() {
  for (let i = 0; i < 50; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/index.html`);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('server did not start');
}

async function idle(page) {
  // networkidle never arrives on pages that stream video; cap the wait.
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
}

async function settleHeader(page) {
  // The header hides on a downward scroll while the footer is in view and
  // only returns on an upward one; end on a deliberate upward step so the
  // scroll handler leaves it in the same state every time.
  await page.evaluate(async () => {
    const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    window.scrollTo(0, 2);
    await frame();
    window.scrollTo(0, 0);
    await frame();
  });
  await page
    .waitForFunction(() => {
      const header = document.querySelector('header');
      return header && !header.classList.contains('is-hidden');
    }, null, { timeout: 3000 })
    .catch(() => {});
  // On a page shorter than the viewport nothing scrolls, and whether the
  // header starts hidden depends on which partial (header or footer) was
  // injected first. Normalise to "shown" so runs are comparable.
  await page.evaluate(() => {
    if (document.documentElement.scrollHeight <= window.innerHeight) {
      document.querySelector('header')?.classList.remove('is-hidden');
    }
  });
}

async function settle(page) {
  await idle(page);
  await page.evaluate(() => document.fonts.ready);
  // Load every image now, not when it scrolls into view.
  await page.evaluate(() => {
    document.querySelectorAll('img').forEach((img) => {
      img.loading = 'eager';
      img.decoding = 'sync';
    });
  });
  // Walk the page so lazy images and viewport observers fire.
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
  });
  await settleHeader(page);
  await idle(page);
  await page.evaluate(
    () =>
      Promise.race([
        Promise.all(
          Array.from(document.images)
            .filter((img) => !img.complete)
            .map((img) => new Promise((r) => { img.onload = r; img.onerror = r; })),
        ),
        new Promise((r) => setTimeout(r, 8000)),
      ]),
  );
  // Async decoding paints late; force every image to be decoded.
  await page.evaluate(() =>
    Promise.all(Array.from(document.images).map((img) => img.decode().catch(() => {}))),
  );
  await page.waitForTimeout(300);
}

const server = startServer();
try {
  await waitForServer();
  const pages = await listPages();
  const outDir = path.join(REPO, '_shots', label);
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch();
  for (const width of widths) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
      locale: 'ru-RU',
      timezoneId: 'Europe/Moscow',
    });
    await context.addInitScript(() => {
      try { localStorage.setItem('site_lang', 'ru'); } catch { /* ignore */ }
    });
    await context.route(/\.(mp4|webm|m4a|mov)(\?.*)?$/i, (route) => route.abort());
    for (const name of pages) {
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:${PORT}/${name}.html`, { waitUntil: 'load' });
      await page.waitForSelector('header, footer', { timeout: 5000 }).catch(() => {});
      await page.addStyleTag({ content: FREEZE_CSS });
      await settle(page);
      // A fullPage screenshot resizes the viewport behind the page's back,
      // which fires the header's scroll/resize logic mid-capture. Resize
      // first, let the page settle again, then capture the viewport.
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      await page.setViewportSize({ width, height });
      await settleHeader(page);
      await page.waitForTimeout(200);
      const file = path.join(outDir, `${name}-${width}.png`);
      await page.screenshot({ path: file, fullPage: false });
      process.stdout.write(`${label}/${name}-${width}.png\n`);
      await page.close();
    }
    await context.close();
  }
  await browser.close();
} finally {
  server.kill();
}
