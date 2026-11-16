import { describe, expect, it } from 'vitest';
import { exerciseImageUrl } from '../src/lib/exerciseImage';

describe('exerciseImageUrl', () => {
  it('devuelve la ruta bajo exercises/ para un id con foto', () => {
    expect(exerciseImageUrl('bench_press')).toMatch(/exercises/bench_press.webp$/);
  });

  it('devuelve null para un id sin foto', () => {
    expect(exerciseImageUrl('frog_pump')).toBeNull();
  });

  it('devuelve null para un ejercicio creado por el usuario', () => {
    expect(exerciseImageUrl('custom-1a2b3c')).toBeNull();
  });
});
