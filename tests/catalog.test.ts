import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { MUSCLES } from '../src/domain/muscles';

describe('catálogo de ejercicios', () => {
  it('los ids son únicos', () => {
    const ids = CATALOG.map((e) => e.id);
    expect(ids.length - new Set(ids).size).toBe(0);
  });

  it('todo ejercicio tiene al menos un músculo principal', () => {
    expect(CATALOG.filter((e) => e.primary.length === 0).map((e) => e.id)).toEqual([]);
  });

  it('principales y secundarios no se repiten en un mismo ejercicio', () => {
    const bad = CATALOG.filter((e) => e.primary.some((m) => e.secondary.includes(m))).map((e) => e.id);
    expect(bad).toEqual([]);
  });

  it('todos los músculos existen en MUSCLES', () => {
    const known = new Set<string>(MUSCLES);
    const bad = CATALOG.filter((e) => [...e.primary, ...e.secondary].some((m) => !known.has(m))).map((e) => e.id);
    expect(bad).toEqual([]);
  });
});
