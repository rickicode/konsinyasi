#!/usr/bin/env node
/**
 * Generate PWA icon PNGs from SVG sources using Playwright.
 *
 * Run from repo root:
 *   node scripts/generate-pwa-icons.js
 */
import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '..', 'src', 'web', 'public');
const iconsDir = resolve(publicDir, 'icons');

mkdirSync(iconsDir, { recursive: true });

const faviconSvg = readFileSync(resolve(publicDir, 'favicon.svg'), 'utf8');
const maskableSvg = readFileSync(resolve(publicDir, 'icon-maskable.svg'), 'utf8');

const targets = [
  { src: faviconSvg, name: 'icon-192x192.png', size: 192 },
  { src: faviconSvg, name: 'icon-512x512.png', size: 512 },
  { src: maskableSvg, name: 'icon-512x512-maskable.png', size: 512 },
];

async function renderIcon(svg, size, outPath) {
  const executablePath = process.env.PW_CHROMIUM_EXECUTABLE || '/usr/bin/chromium';
  const browser = await chromium.launch({ executablePath });
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  });
  // Ensure the SVG fills the viewport; add explicit width/height if missing.
  const sizedSvg = svg.includes('width=')
    ? svg.replace(/width="[^"]+"/, `width="${size}"`).replace(/height="[^"]+"/, `height="${size}"`)
    : svg.replace('<svg', `<svg width="${size}" height="${size}"`);

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${size}px; height: ${size}px; background: transparent; }
      svg { width: 100%; height: 100%; display: block; }
    </style>
  </head>
  <body>${sizedSvg}</body>
</html>`;

  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.screenshot({ path: outPath, omitBackground: false });
  await browser.close();
}

async function main() {
  console.log('Generating PWA icons…');
  for (const target of targets) {
    const outPath = resolve(iconsDir, target.name);
    await renderIcon(target.src, target.size, outPath);
    console.log(`  ✓ ${target.name}`);
  }
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
