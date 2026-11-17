import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import type { CatalogFile } from '../src/domain/catalogSchema';
import { validateCatalog } from '../src/domain/catalogValidation';

const read = (rel: string) => readFileSync(new URL(`../data/catalogo/${rel}`, import.meta.url), 'utf8');

describe('catálogo unificado (data/catalogo/ejercicios.json)', () => {
  const file = JSON.parse(read('ejercicios.json')) as CatalogFile;
  const muscles = JSON.parse(read('musculos.json')) as { id: string }[];
  const byId = new Map(file.ejercicios.map((e) => [e.id, e]));

  it('cumple todas las reglas del validador', () => {
    const errors = validateCatalog(file, {
      muscleIds: muscles.map((m) => m.id),
      requiredIds: CATALOG.map((e) => e.id),
    });
    expect(errors, `\n${errors.join('\n')}\n`).toEqual([]);
  });

  it('tiene exactamente 240 ejercicios', () => {
    expect(file.ejercicios).toHaveLength(240);
  });

  it('unilateral coincide con CATALOG en ambos sentidos', () => {
    for (const c of CATALOG) {
      expect(byId.get(c.id)?.unilateral === true, c.id).toBe(c.unilateral === true);
    }
  });

  it('el grupo coincide con CATALOG', () => {
    for (const c of CATALOG) expect(byId.get(c.id)?.grupo, c.id).toBe(c.group);
  });

  it('ninguna fuente menciona symmetry', () => {
    for (const e of file.ejercicios) {
      expect(JSON.stringify(e.fuentes ?? []).toLowerCase(), e.id).not.toContain('symmetry');
    }
  });
});
