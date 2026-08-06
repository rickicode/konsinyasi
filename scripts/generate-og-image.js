#!/usr/bin/env node
/**
 * Generate the storefront Open Graph image (og-image.png) from og-image.svg.
 *
 * Social platforms (WhatsApp, Telegram, Facebook) do not render SVG for
 * og:image reliably, so we ship a 1200x630 PNG.
 *
 * Run from repo root:
 *   node scripts/generate-og-image.js
 */
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '..', 'storefront', 'public');
const svgPath = resolve(publicDir, 'og-image.svg');
const pngPath = resolve(publicDir, 'og-image.png');

const WIDTH = 1200;
const HEIGHT = 630;

async function main() {
  const svg = readFileSync(svgPath, 'utf8');
  const executablePath = process.env.PW_CHROMIUM_EXECUTABLE || '/usr/bin/chromium';
  const browser = await chromium.launch({ executablePath });
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  });

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${WIDTH}px; height: ${HEIGHT}px; background: transparent; }
      svg { width: 100%; height: 100%; display: block; }
    </style>
  </head>
  <body>${svg}</body>
</html>`;

  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.screenshot({ path: pngPath, omitBackground: false });
  await browser.close();

  const stats = readFileSync(pngPath).length;
  console.log(`  ✓ ${pngPath} (${(stats / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
