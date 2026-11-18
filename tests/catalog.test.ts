import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { MUSCLES } from '../src/domain/muscles';

describe('catálogo de ejercicios', () => {
  it('los ids son únicos', () => {
    const ids = CATALOG.map((e) => e.id);
    expect(ids.length - new Set(ids).size).toBe(0);
  });

  it('tiene los 240 ejercicios', () => {
    expect(CATALOG).toHaveLength(240);
  });

  it('todo ejercicio tiene al menos un músculo principal', () => {
    expect(CATALOG.filter((e) => !e.muscles.some((m) => m.role === 'principal')).map((e) => e.id)).toEqual([]);
  });

  it('ningún músculo se repite en un mismo ejercicio', () => {
    const bad = CATALOG.filter((e) => new Set(e.muscles.map((m) => m.id)).size !== e.muscles.length).map((e) => e.id);
    expect(bad).toEqual([]);
  });

  it('todos los músculos existen en MUSCLES', () => {
    const known = new Set<string>(MUSCLES);
    const bad = CATALOG.filter((e) => e.muscles.some((m) => !known.has(m.id))).map((e) => e.id);
    expect(bad).toEqual([]);
  });

  it('se conservan los datos de la ficha', () => {
    const bench = CATALOG.find((e) => e.id === 'bench_press')!;
    expect(bench).toMatchObject({
      nameEs: 'Press de banca', nameEn: 'Bench press', group: 'chest', equipment: 'barbell',
      mechanics: 'Compuesto', custom: false, updatedAt: 0, unilateral: false,
    });
    expect(bench.muscles[0]).toEqual({ id: 'pectoral_esternal', role: 'principal', activation: 1 });
    expect(bench.descriptionEs).toBeTruthy();
    expect(bench.descriptionEn).toBeTruthy();
    expect(bench.patternEs).toBe('Empuje horizontal');
    expect(bench.patternEn).toBe('Horizontal push');
    expect(['alta', 'media', 'baja']).toContain(bench.confidence);
  });
});
