import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';

const MAP: Record<string, string> = JSON.parse(
  readFileSync(new URL('../scripts/exercise-image-map.json', import.meta.url), 'utf-8'),
);

describe('mapa ejercicio → foto', () => {
  it('cada id del mapa existe en CATALOG', () => {
    const ids = new Set(CATALOG.map((e) => e.id));
    expect(Object.keys(MAP).filter((id) => !ids.has(id))).toEqual([]);
  });

  it('no hay dos ejercicios con la misma carpeta de foto', () => {
    const seen = new Map<string, string>();
    const dups: string[] = [];
    for (const [id, folder] of Object.entries(MAP)) {
      if (seen.has(folder)) dups.push(`${seen.get(folder)} y ${id} → ${folder}`);
      else seen.set(folder, id);
    }
    expect(dups).toEqual([]);
  });
});
