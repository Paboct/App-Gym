import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GROUPS, MUSCLES, MUSCLE_GROUP, MUSCLE_NAMES } from '../src/domain/muscles';

interface MuscleRow { id: string; nombre_es: string; nombre_en: string; grupo: string }
const rows: MuscleRow[] = JSON.parse(readFileSync('data/catalogo/musculos.json', 'utf8'));

describe('músculos de la app = data/catalogo/musculos.json', () => {
  it('los 35 ids en el mismo orden', () => {
    expect([...MUSCLES]).toEqual(rows.map((r) => r.id));
  });
  it('mismo grupo (de los 12 de la app) y mismos nombres', () => {
    for (const r of rows) {
      const id = r.id as (typeof MUSCLES)[number];
      expect(MUSCLE_GROUP[id], r.id).toBe(r.grupo);
      expect(GROUPS, r.id).toContain(MUSCLE_GROUP[id]);
      expect(MUSCLE_NAMES[id], r.id).toEqual({ es: r.nombre_es, en: r.nombre_en });
    }
  });
  it('el braquiorradial cuenta como bíceps', () => {
    expect(MUSCLE_GROUP.braquiorradial).toBe('biceps');
  });
  it('src/data/catalog.json es copia exacta de data/catalogo/ejercicios.json', () => {
    expect(readFileSync('src/data/catalog.json', 'utf8')).toBe(readFileSync('data/catalogo/ejercicios.json', 'utf8'));
  });
});
