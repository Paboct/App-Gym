// Uso: node scripts/catalogo/generar-catalog-json.mjs
// Lee data/catalogo/ejercicios.json y escribe src/data/catalog.json SIN `fuentes`
// (las referencias bibliográficas no hacen falta en la app y pesaban ~273 kB).
import { readFileSync, writeFileSync } from 'node:fs';

const rel = (p) => new URL(p, import.meta.url);
const full = JSON.parse(readFileSync(rel('../../data/catalogo/ejercicios.json'), 'utf-8'));
const slim = { ...full, ejercicios: full.ejercicios.map(({ fuentes, ...resto }) => resto) };
writeFileSync(rel('../../src/data/catalog.json'), JSON.stringify(slim) + '\n');
console.log(`catalog.json: ${slim.ejercicios.length} ejercicios, sin fuentes`);
