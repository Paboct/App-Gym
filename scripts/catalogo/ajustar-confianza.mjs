// Baja a "baja" la confianza de todo ejercicio con confianza "media" cuyas fuentes
// no contengan una cita concreta de EMG/literatura (autor + año, p. ej. «Contreras 2015»).
// Lee y reescribe data/catalogo/lotes/*.json. Después, ejecutar unir.mjs e informe.mjs.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const dir = new URL('../../data/catalogo/lotes/', import.meta.url);
// Apellido + (opcional «y cols.»/«et al.») + año de 4 cifras.
const CITA = /\p{Lu}[\p{L}'-]+(?:\s+(?:y\s+cols\.|et\s+al\.))?,?\s+(?:19|20)\d{2}/u;

const cambiados = [];
for (const f of readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
  const url = new URL(f, dir);
  const file = JSON.parse(readFileSync(url, 'utf-8'));
  let tocado = false;
  for (const e of file.ejercicios) {
    if (e.confianza !== 'media') continue;
    if ((e.fuentes ?? []).some((s) => CITA.test(s))) continue;
    e.confianza = 'baja';
    cambiados.push(e.id);
    tocado = true;
  }
  if (tocado) writeFileSync(url, JSON.stringify(file, null, 2) + '\n');
}
console.log(`media -> baja: ${cambiados.length}`);
console.log(cambiados.join('\n'));
