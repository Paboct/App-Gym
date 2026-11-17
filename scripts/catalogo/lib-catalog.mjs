// Lectura compartida del catálogo de la app (src/data/catalog.ts).
import { readFileSync } from 'node:fs';

/** Devuelve [{ id, nombre }] en el orden de CATALOG_RAW de src/data/catalog.ts. */
export function readCatalogRows() {
  const url = new URL('../../src/data/catalog.ts', import.meta.url);
  const raw = readFileSync(url, 'utf-8').split('`')[1];
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.includes('|') && !l.startsWith('*') && !l.startsWith('//'))
    .map((l) => {
      const [id, nombre] = l.split('|');
      return { id, nombre };
    });
}
