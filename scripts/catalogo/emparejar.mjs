// Empareja los ejercicios de Gemini con los ids del catálogo de la app.
// Uso: node scripts/catalogo/emparejar.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const raiz = new URL('../../', import.meta.url);
const gemini = JSON.parse(readFileSync(new URL('data/catalogo/gemini-ejercicios.json', raiz), 'utf-8')).ejercicios;
const raw = readFileSync(new URL('src/data/catalog.ts', raiz), 'utf-8').split('`')[1];
const catalogo = raw.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.includes('|') && !l.startsWith('*') && !l.startsWith('//')).map((l) => {
  const [id, es] = l.split('|');
  return { id, nombre: es };
});

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const palabras = (s) => new Set(norm(s).split(' ').filter(Boolean));
const jaccard = (a, b) => {
  const A = palabras(a), B = palabras(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  return inter / (A.size + B.size - inter || 1);
};
const puntuar = (g) => catalogo.map((c) => ({
  c, s: norm(g.nombre) === norm(c.nombre) ? 1 : jaccard(g.nombre, c.nombre),
})).sort((x, y) => y.s - x.s);

const res = {};
const top2 = {};
for (const g of gemini) {
  const r = puntuar(g);
  top2[g.id] = r.slice(0, 2);
  const mejor = r[0];
  const exacto = norm(g.nombre) === norm(mejor.c.nombre);
  if (mejor.s >= 0.8) {
    res[g.id] = { appId: mejor.c.id, motivo: exacto ? 'exacto' : `solapamiento ${mejor.s.toFixed(2)} con «${mejor.c.nombre}»` };
  } else {
    res[g.id] = { appId: null, motivo: `mejor candidato «${mejor.c.nombre}» (${mejor.c.id}) con ${mejor.s.toFixed(2)}` };
  }
}
// Duplicados
const porApp = {};
for (const [gid, r] of Object.entries(res)) if (r.appId) (porApp[r.appId] ??= []).push(gid);
for (const [appId, ids] of Object.entries(porApp)) {
  if (ids.length < 2) continue;
  for (const gid of ids) res[gid].motivo += `; duplicado con ${ids.filter((i) => i !== gid).join(', ')}`;
}

writeFileSync(new URL('data/catalogo/emparejamiento.json', raiz), JSON.stringify(res, null, 2) + '\n');

const nombreG = Object.fromEntries(gemini.map((g) => [g.id, g.nombre]));
const emp = Object.values(res).filter((r) => r.appId).length;
console.log(`Emparejados: ${emp} de ${gemini.length}  (catálogo: ${catalogo.length} ejercicios)\n`);
console.log('DUDOSOS (puntuación < 1) Y NULOS:\nidGemini | nombre Gemini | candidato app (id, nombre) | puntuación');
for (const g of gemini) {
  const t = top2[g.id][0];
  if (t.s < 1 || !res[g.id].appId) {
    console.log(`${g.id} | ${g.nombre} | (${t.c.id}, ${t.c.nombre}) | ${t.s.toFixed(2)}${res[g.id].appId ? '' : ' | NULL'}`);
  }
}
console.log('\nTOP-2 POR EJERCICIO:');
for (const g of gemini) {
  console.log(`${g.id} | ${g.nombre} | ` + top2[g.id].map((t) => `(${t.c.id}, ${t.c.nombre}) ${t.s.toFixed(2)}`).join(' ; '));
}
