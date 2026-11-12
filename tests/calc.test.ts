import { describe, expect, it } from 'vitest';
import {
  bestSet,
  e1rm,
  effectivePlan,
  formatDuration,
  formatWeight,
  isNewPr,
  kgToUnit,
  setVolume,
  suggestNext,
  totalVolume,
  unitToKg,
} from '../src/domain/calc';
import type { SetLog } from '../src/domain/types';

function set(partial: Partial<SetLog>): SetLog {
  return {
    id: 's',
    workoutId: 'w',
    workoutExerciseId: 'we',
    exerciseId: 'e',
    index: 0,
    kind: 'work',
    weight: 100,
    reps: 5,
    rir: 9,
    drops: [],
    done: true,
    updatedAt: 0,
    ...partial,
  };
}

describe('1RM estimado (Epley)', () => {
  it('con 1 repetición es el propio peso', () => {
    expect(e1rm(140, 1)).toBe(140);
  });
  it('100 kg × 5 ≈ 116,7 kg', () => {
    expect(e1rm(100, 5)).toBeCloseTo(116.667, 2);
  });
  it('sin peso o sin repeticiones no hay 1RM', () => {
    expect(e1rm(0, 10)).toBe(0);
    expect(e1rm(80, 0)).toBe(0);
  });
});

describe('volumen', () => {
  it('es peso × repeticiones de las series efectivas hechas', () => {
    expect(setVolume(set({ weight: 40, reps: 10 }))).toBe(400);
  });
  it('no cuentan las series de aproximación', () => {
    expect(setVolume(set({ kind: 'warmup' }))).toBe(0);
  });
  it('no cuentan las bajadas del dropset', () => {
    const s = set({ weight: 60, reps: 8, drops: [{ weight: 40, reps: 6 }, { weight: 30, reps: 5 }] });
    expect(setVolume(s)).toBe(480);
  });
  it('no cuentan las series sin hacer', () => {
    expect(totalVolume([set({ done: false }), set({ weight: 50, reps: 10 })])).toBe(500);
  });
  it('en dominadas solo cuenta el lastre registrado', () => {
    expect(setVolume(set({ weight: 10, reps: 8 }))).toBe(80);
    expect(setVolume(set({ weight: 0, reps: 12 }))).toBe(0);
  });
});

describe('récords', () => {
  it('la primera marca no es récord: fija el punto de partida', () => {
    expect(isNewPr(120, null)).toBe(false);
  });
  it('es récord si supera el mejor 1RM anterior', () => {
    expect(isNewPr(121, 120)).toBe(true);
    expect(isNewPr(120, 120)).toBe(false);
    expect(isNewPr(119, 120)).toBe(false);
  });
  it('la mejor serie es la de mayor 1RM estimado, no la de más peso', () => {
    const heavy = set({ id: 'a', weight: 100, reps: 3 }); // 110
    const reps = set({ id: 'b', weight: 90, reps: 10 }); // 120
    expect(bestSet([heavy, reps])?.id).toBe('b');
  });
  it('ignora aproximación y series sin hacer', () => {
    expect(bestSet([set({ kind: 'warmup' }), set({ done: false })])).toBeNull();
  });
});

describe('plan efectivo por microciclo', () => {
  const pe = { exerciseId: 'bench', sets: 4, targetRir: 9 as const, setsByMicro: {}, rirByMicro: {}, exerciseByMicro: {} };
  it('sin variaciones usa el plan base', () => {
    expect(effectivePlan(pe, { deloadMicro: null }, 2)).toEqual({ exerciseId: 'bench', sets: 4, targetRir: 9, substituted: false });
  });
  it('aplica variaciones de series y RIR de esa semana', () => {
    const plan = effectivePlan({ ...pe, setsByMicro: { 3: 5 }, rirByMicro: { 3: 10 } }, { deloadMicro: null }, 3);
    expect(plan.sets).toBe(5);
    expect(plan.targetRir).toBe(10);
  });
  it('en descarga reduce a la mitad las series y baja el RIR a 8', () => {
    const plan = effectivePlan(pe, { deloadMicro: 6 }, 6);
    expect(plan.sets).toBe(2);
    expect(plan.targetRir).toBe(8);
  });
  it('una variación explícita manda sobre la descarga', () => {
    expect(effectivePlan({ ...pe, setsByMicro: { 6: 3 } }, { deloadMicro: 6 }, 6).sets).toBe(3);
  });
  it('aplica la sustitución de ejercicio solo en su semana', () => {
    const sub = { ...pe, exerciseByMicro: { 2: 'db_bench' } };
    expect(effectivePlan(sub, { deloadMicro: null }, 2)).toMatchObject({ exerciseId: 'db_bench', substituted: true });
    expect(effectivePlan(sub, { deloadMicro: null }, 3)).toMatchObject({ exerciseId: 'bench', substituted: false });
  });
});

describe('sugerencia de progresión', () => {
  it('sin referencia no sugiere nada', () => {
    expect(suggestNext(null, 8, 12)).toBeNull();
  });
  it('si llegaste al tope del rango, sube peso', () => {
    expect(suggestNext({ weight: 80, reps: 12 }, 8, 12)).toEqual({ weight: 82.5, repMin: 8, repMax: 12, kind: 'increase' });
  });
  it('si no, mismo peso y una repetición más', () => {
    expect(suggestNext({ weight: 80, reps: 9 }, 8, 12)).toEqual({ weight: 80, repMin: 10, repMax: 12, kind: 'hold' });
  });
  it('por debajo del rango apunta al mínimo', () => {
    expect(suggestNext({ weight: 80, reps: 5 }, 8, 12)?.repMin).toBe(8);
  });
});

describe('unidades y formato', () => {
  it('convierte kg ↔ lb de ida y vuelta', () => {
    expect(kgToUnit(100, 'lb')).toBeCloseTo(220.46, 1);
    expect(unitToKg(kgToUnit(72.5, 'lb'), 'lb')).toBeCloseTo(72.5, 6);
  });
  it('formatea pesos sin decimales basura', () => {
    expect(formatWeight(82.5, 'kg', 'es')).toBe('82,5');
    expect(formatWeight(100, 'kg', 'en')).toBe('100');
  });
  it('formatea duraciones', () => {
    expect(formatDuration(75)).toBe('1:15');
    expect(formatDuration(3725)).toBe('1:02:05');
  });
});
