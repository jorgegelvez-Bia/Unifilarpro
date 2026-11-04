// Genera los íconos PNG de la app instalable a partir de public/logo.svg.
// Correr (solo si cambia el logo):  node scripts/make-icons.mjs
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const svg = readFileSync(new URL('../public/logo.svg', import.meta.url), 'utf8');
// "maskable": Android recorta el ícono en círculo o gota; el logo va al 72 % sobre fondo lleno.
const ICONS = [
  ['pwa-192.png', 192, 1, false],
  ['pwa-512.png', 512, 1, false],
  ['pwa-maskable-512.png', 512, 0.72, true],
  ['apple-touch-icon.png', 180, 0.86, true],
];
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size, k, full] of ICONS) {
  const inner = Math.round(size * k);
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0;width:${size}px;height:${size}px;display:grid;place-items:center;background:${full ? '#17262B' : 'transparent'}">
    <div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></body>`);
  await page.screenshot({ path: new URL(`../public/${name}`, import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'), omitBackground: !full });
  console.log('listo', name);
}
await browser.close();
