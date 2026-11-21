// Procesa las fotos de free-exercise-db (Unlicense) para la app:
// cuadrado 400 px, tinte oscuro uniforme, WebP. Escribe public/exercises/<id>.webp
// y el índice src/data/exerciseImages.ts.
//
// Uso: node scripts/build-exercise-images.mjs --src <clon de free-exercise-db> [--variant warm|slate|ink] (por defecto warm)
// En el mapa, "Carpeta" usa la foto 0.jpg y "Carpeta:1" usa 1.jpg.
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const SIZE = 400;
const QUALITY = 72;

/** Tintes: escala de grises + color de sombra/luz + oscurecido. */
export const VARIANTS = {
  slate: { tint: '#7f9cc8', brightness: 0.75, gamma: 1.15 },
  ink: { tint: '#b4b8c4', brightness: 0.6, gamma: 1.3 },
  warm: { tint: '#d0a880', brightness: 0.7, gamma: 1.2 },
};

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export async function processImage(file, variant = 'slate') {
  const v = VARIANTS[variant];
  const [r, g, b] = hexToRgb(v.tint).map((c) => c / 255);
  return sharp(file)
    .resize(SIZE, SIZE, { fit: 'cover', position: 'attention' })
    .greyscale()
    .toColourspace('srgb')
    .gamma(v.gamma)
    // Gris -> color del tinte: cada canal se escala por el tinte (duotono sombra negra / luz tintada).
    .recomb([
      [r, 0, 0],
      [0, g, 0],
      [0, 0, b],
    ])
    .modulate({ brightness: v.brightness })
    .webp({ quality: QUALITY })
    .toBuffer();
}

export function sourceFile(src, entry) {
  const [folder, frame = '0'] = entry.split(':');
  return path.join(src, 'exercises', folder, `${frame}.jpg`);
}

async function main() {
  const args = process.argv.slice(2);
  const get = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
  const src = get('--src');
  const variant = get('--variant') ?? 'warm';
  if (!src || !VARIANTS[variant]) {
    console.error('Uso: node scripts/build-exercise-images.mjs --src <ruta> [--variant warm|slate|ink] (por defecto warm)');
    process.exit(1);
  }
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const map = JSON.parse(readFileSync(path.join(root, 'scripts/exercise-image-map.json'), 'utf-8'));
  const outDir = path.join(root, 'public/exercises');
  mkdirSync(outDir, { recursive: true });

  const done = [];
  for (const [id, entry] of Object.entries(map)) {
    const file = sourceFile(src, entry);
    if (!existsSync(file)) {
      console.warn(`Falta la foto de origen de ${id}: ${file}`);
      continue;
    }
    writeFileSync(path.join(outDir, `${id}.webp`), await processImage(file, variant));
    done.push(id);
  }
  // Fotos de ejercicios propios (id = UUID): no salen del mapa, se conservan si ya están en la carpeta.
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;
  for (const f of readdirSync(outDir)) if (uuid.test(f)) done.push(f.replace('.webp', ''));
  done.sort();
  const index =
    '// Generado por scripts/build-exercise-images.mjs. No editar a mano.\n' +
    '/** Ids de ejercicio que tienen foto en public/exercises/<id>.webp */\n' +
    'export const EXERCISE_IMAGE_IDS: ReadonlySet<string> = new Set([\n' +
    done.map((id) => `  '${id}',`).join('\n') +
    '\n]);\n';
  writeFileSync(path.join(root, 'src/data/exerciseImages.ts'), index);
  console.log(`${done.length} fotos generadas con la variante ${variant}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
