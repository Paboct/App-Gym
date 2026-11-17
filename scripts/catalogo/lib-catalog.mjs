// Lectura compartida del catálogo de la app (data/catalogo/catalogo-legacy.txt, copia congelada del catálogo antiguo).
import { readFileSync } from 'node:fs';

/** Devuelve [{ id, nombre }] en el orden del archivo congelado. */
export function readCatalogRows() {
  const url = new URL('../../data/catalogo/catalogo-legacy.txt', import.meta.url);
  const raw = readFileSync(url, 'utf-8');
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.includes('|') && !l.startsWith('*') && !l.startsWith('//'))
    .map((l) => {
      const [id, nombre] = l.split('|');
      return { id, nombre };
    });
}
