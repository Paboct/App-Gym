import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import type { CatalogFile } from '../src/domain/catalogSchema';
import { validateCatalog } from '../src/domain/catalogValidation';

/**
 * Valida un lote de ejercicios generado por un subagente.
 * Uso: CATALOGO_LOTE=<ruta.json> npx vitest run tests/catalogLote.test.ts
 */
const lotePath = process.env.CATALOGO_LOTE;

describe.skipIf(!lotePath)('lote del catálogo', () => {
  it('cumple todas las reglas del validador', () => {
    const file = JSON.parse(readFileSync(lotePath as string, 'utf8')) as CatalogFile;
    const muscles = JSON.parse(readFileSync(new URL('../data/catalogo/musculos.json', import.meta.url), 'utf8')) as { id: string }[];
    const groups = new Set(file.ejercicios.map((e) => e.grupo));
    const requiredIds = CATALOG.filter((c) => groups.has(c.group)).map((c) => c.id);
    const errors = validateCatalog(file, { muscleIds: muscles.map((m) => m.id), requiredIds });
    expect(errors, `\n${errors.join('\n')}\n`).toEqual([]);
  });
});
