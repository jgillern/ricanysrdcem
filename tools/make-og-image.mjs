#!/usr/bin/env node
/**
 * Vygeneruje OG image (1200×630) pro náhled odkazu na sociálních sítích
 * → assets/og-image.png
 *
 * Skládá se z brandového loga (assets/logo-new.webp), termínu voleb a patičky
 * se složením kandidátky. Text sází v PT Serif / PT Sans, tj. ve stejných
 * fontech jako web — fonty se berou z npm balíčků @fontsource (Google Fonts
 * je z tohohle prostředí nedostupný).
 *
 * Spuštění (z rootu repa):
 *   mkdir -p /tmp/og && cd /tmp/og
 *   npm pack @fontsource/pt-serif @fontsource/pt-sans
 *   tar xzf fontsource-pt-serif-*.tgz && mv package pt-serif
 *   tar xzf fontsource-pt-sans-*.tgz  && mv package pt-sans
 *   npm i playwright-core
 *   cd - && FONT_DIR=/tmp/og node tools/make-og-image.mjs
 *
 * Chromium je v tomhle prostředí předinstalovaný (PLAYWRIGHT_BROWSERS_PATH),
 * jinak stačí `npx playwright install chromium`.
 */
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const FONT_DIR = process.env.FONT_DIR || '/tmp/og';
const OUT = resolve(ROOT, 'assets/og-image.png');

const b64 = (p) => readFileSync(p).toString('base64');
const font = (family, weight, style, file) => `
  @font-face {
    font-family: "${family}"; font-weight: ${weight}; font-style: ${style};
    src: url(data:font/woff2;base64,${b64(file)}) format("woff2");
  }`;

const css = [
  font('PT Serif', 700, 'normal', `${FONT_DIR}/pt-serif/files/pt-serif-latin-ext-700-normal.woff2`),
  font('PT Serif', 700, 'italic', `${FONT_DIR}/pt-serif/files/pt-serif-latin-ext-700-italic.woff2`),
  font('PT Sans', 700, 'normal', `${FONT_DIR}/pt-sans/files/pt-sans-latin-ext-700-normal.woff2`),
  font('PT Sans', 400, 'normal', `${FONT_DIR}/pt-sans/files/pt-sans-latin-ext-400-normal.woff2`),
].join('\n');

const logo = b64(resolve(ROOT, 'assets/logo-new.webp'));

const html = `<!doctype html>
<html lang="cs"><head><meta charset="utf-8"><style>
${css}
* { box-sizing: border-box; margin: 0; }
body {
  width: 1200px; height: 630px; overflow: hidden;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 34px; padding: 64px 80px;
  background: radial-gradient(ellipse at 50% 22%, #ffffff 0%, #f0f7fc 55%, #e3eef8 100%);
  font-family: "PT Sans", sans-serif; color: #142235;
}
.logo { width: 720px; }
.date {
  display: inline-flex; align-items: center; gap: 18px;
  font-weight: 700; text-transform: uppercase; letter-spacing: 0.16em;
  font-size: 25px; color: #1872aa;
}
.date::before, .date::after {
  content: ""; width: 46px; height: 3px; background: #d93434; display: block;
}
.claim {
  font-family: "PT Serif", Georgia, serif; font-weight: 700; font-style: italic;
  font-size: 40px; line-height: 1.15; color: #142235; text-align: center;
}
.partners { font-size: 22px; color: #4a5a72; text-align: center; }
</style></head><body>
  <img class="logo" src="data:image/webp;base64,${logo}" alt="">
  <div class="date">Komunální volby 9.–10. října 2026</div>
  <div class="claim">Otevřeně, slušně, a&nbsp;hlavně srdcem.</div>
  <div class="partners">Společná kandidátka TOP&nbsp;09, KDU·ČSL a&nbsp;nezávislých kandidátů</div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
writeFileSync(OUT, await page.screenshot({ type: 'png' }));
await browser.close();
console.log('OK →', OUT);
