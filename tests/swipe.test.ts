import { describe, expect, it } from 'vitest';
import { swipeTarget } from '../src/lib/swipe';

describe('swipeTarget', () => {
  it('izquierda va a la pestaña siguiente y derecha a la anterior', () => {
    expect(swipeTarget('/', -120, 5, 200)).toBe('/history');
    expect(swipeTarget('/train', -120, 0, 200)).toBe('/kpis');
    expect(swipeTarget('/train', 120, 0, 200)).toBe('/history');
  });
  it('no pasa de los extremos', () => {
    expect(swipeTarget('/', 120, 0, 200)).toBeNull();
    expect(swipeTarget('/profile', -120, 0, 200)).toBeNull();
  });
  it('ignora gestos cortos, lentos o más verticales que horizontales', () => {
    expect(swipeTarget('/train', -40, 0, 200)).toBeNull();
    expect(swipeTarget('/train', -120, 0, 1200)).toBeNull();
    expect(swipeTarget('/train', -100, 90, 200)).toBeNull();
  });
  it('solo actúa en las pestañas principales', () => {
    expect(swipeTarget('/workout/abc', -120, 0, 200)).toBeNull();
    expect(swipeTarget('/history/abc', -120, 0, 200)).toBeNull();
    expect(swipeTarget('/kpis/compare', 120, 0, 200)).toBeNull();
  });
});
