import { existsSync, readdirSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EXERCISE_IMAGE_IDS } from '../src/data/exerciseImages';

const DIR = new URL('../public/exercises/', import.meta.url);

describe('fotos de ejercicios', () => {
  it('cada id de EXERCISE_IMAGE_IDS tiene su archivo en public/exercises', () => {
    const missing = [...EXERCISE_IMAGE_IDS].filter((id) => !existsSync(new URL(`${id}.webp`, DIR)));
    expect(missing).toEqual([]);
  });

  it('no sobran archivos que el índice no conozca', () => {
    const extra = readdirSync(DIR).filter((f) => !EXERCISE_IMAGE_IDS.has(f.replace(/\.webp$/, '')));
    expect(extra).toEqual([]);
  });

  it('las fotos pesan menos de 8 MB en total', () => {
    const total = readdirSync(DIR).reduce((sum, f) => sum + statSync(new URL(f, DIR)).size, 0);
    expect(total).toBeLessThan(8 * 1024 * 1024);
  });
});
