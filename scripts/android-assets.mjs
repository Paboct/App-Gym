// Genera los iconos y las pantallas de arranque de Android a partir de public/logo.svg.
// Uso: CHROME_PATH=/ruta/a/chrome node scripts/android-assets.mjs
// Hay que volver a ejecutarlo si cambia el logo o si se regenera la carpeta android/.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const RES = 'android/app/src/main/res';
const BG = '#0b0b0c';
const logo = `data:image/svg+xml;base64,${readFileSync('public/logo.svg').toString('base64')}`;

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const page = await browser.newPage();

/** Renderiza el logo centrado ocupando `ratio` del lado corto, sobre un fondo opcional. */
async function render(file, width, height, { ratio, background, radius = '0' }) {
  await page.setViewportSize({ width, height });
  await page.setContent(
    `<body style="margin:0;width:${width}px;height:${height}px;display:grid;place-items:center;background:transparent">
       <div style="width:100%;height:100%;display:grid;place-items:center;background:${background ?? 'transparent'};border-radius:${radius}">
         <img src="${logo}" style="width:${Math.round(Math.min(width, height) * ratio)}px">
       </div>
     </body>`,
  );
  await page.screenshot({ path: file, omitBackground: true });
}

const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [name, scale] of Object.entries(DENSITIES)) {
  const dir = join(RES, `mipmap-${name}`);
  const icon = Math.round(48 * scale);
  const layer = Math.round(108 * scale);
  await render(join(dir, 'ic_launcher.png'), icon, icon, { ratio: 0.66, background: BG, radius: '22%' });
  await render(join(dir, 'ic_launcher_round.png'), icon, icon, { ratio: 0.6, background: BG, radius: '50%' });
  // Capa del icono adaptativo: el sistema recorta, así que el logo va dentro de la zona segura.
  await render(join(dir, 'ic_launcher_foreground.png'), layer, layer, { ratio: 0.42 });
}

const SPLASHES = {
  drawable: [480, 320],
  'drawable-land-mdpi': [480, 320],
  'drawable-land-hdpi': [800, 480],
  'drawable-land-xhdpi': [1280, 720],
  'drawable-land-xxhdpi': [1600, 960],
  'drawable-land-xxxhdpi': [1920, 1280],
  'drawable-port-mdpi': [320, 480],
  'drawable-port-hdpi': [480, 800],
  'drawable-port-xhdpi': [720, 1280],
  'drawable-port-xxhdpi': [960, 1600],
  'drawable-port-xxxhdpi': [1280, 1920],
};
for (const [dir, [width, height]] of Object.entries(SPLASHES)) {
  if (!readdirSync(RES).includes(dir)) continue;
  await render(join(RES, dir, 'splash.png'), width, height, { ratio: 0.3, background: BG });
}

writeFileSync(
  join(RES, 'values/ic_launcher_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BG}</color>\n</resources>\n`,
);

await browser.close();
console.log('Iconos y pantallas de arranque de Android generados.');
