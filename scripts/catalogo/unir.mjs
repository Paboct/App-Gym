// Une los lotes de data/catalogo/lotes/*.json en data/catalogo/ejercicios.json,
// en el orden de src/data/catalog.ts. Falla si falta o sobra algún id.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const rel = (p) => new URL(p, import.meta.url);
const raw = readFileSync(rel('../../src/data/catalog.ts'), 'utf-8').split('`')[1];
const order = raw.trim().split('\n').filter((l) => l.includes('|')).map((l) => l.split('|')[0]);

const dir = rel('../../data/catalogo/lotes/');
const byId = new Map();
for (const f of readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
  for (const e of JSON.parse(readFileSync(new URL(f, dir), 'utf-8')).ejercicios) byId.set(e.id, e);
}

const missing = order.filter((id) => !byId.has(id));
const orderSet = new Set(order);
const extra = [...byId.keys()].filter((id) => !orderSet.has(id));
if (missing.length || extra.length) {
  console.error(`Faltan: ${missing.join(', ') || '-'}\nSobran: ${extra.join(', ') || '-'}`);
  process.exit(1);
}

const out = { version: '1.0.0', ejercicios: order.map((id) => byId.get(id)) };
writeFileSync(rel('../../data/catalogo/ejercicios.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`ejercicios.json: ${out.ejercicios.length} ejercicios`);
