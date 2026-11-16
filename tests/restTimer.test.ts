import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearRest, extendRest, getRest, startRest } from '../src/lib/restTimer';
import { DEFAULT_PLANNED } from '../src/data/repo';

const T0 = new Date('2026-01-01T10:00:00Z').getTime();

describe('restTimer', () => {
  beforeEach(() => vi.useFakeTimers().setSystemTime(T0));
  afterEach(() => {
    clearRest();
    vi.useRealTimers();
  });

  it('el descanso por defecto es de 2:30', () => {
    expect(DEFAULT_PLANNED.restSec).toBe(150);
  });

  it('startRest fija el final a now + segundos', () => {
    startRest(150);
    expect(getRest()?.endsAt).toBe(T0 + 150_000);
  });

  it('extendRest suma y resta segundos', () => {
    startRest(150);
    extendRest(15);
    expect(getRest()?.endsAt).toBe(T0 + 165_000);
    extendRest(-30);
    expect(getRest()?.endsAt).toBe(T0 + 135_000);
  });

  it('restar más de lo que queda deja el descanso terminado, sin tiempo negativo', () => {
    startRest(10);
    extendRest(-15);
    expect(getRest()?.endsAt).toBe(T0);
  });

  it('sumar tras terminar cuenta desde ahora y rearma el aviso', () => {
    startRest(10);
    vi.setSystemTime(T0 + 20_000);
    extendRest(30);
    expect(getRest()?.endsAt).toBe(T0 + 50_000);
    expect(getRest()?.notified).toBe(false);
  });

  it('clearRest quita el descanso', () => {
    startRest(60);
    clearRest();
    expect(getRest()).toBeNull();
  });
});
