import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { compareMesocycles, microSeries, pickDefaultPair, type CompareInput } from '../src/domain/compare';
import type { WorkoutSets } from '../src/domain/kpi';
import type { Exercise, Mesocycle, PrRecord, SetLog, Workout } from '../src/domain/types';

const exercises = new Map<string, Exercise>(CATALOG.map((e) => [e.id, e]));

function meso(id: string, createdAt: number, microcycles = 6): Mesocycle {
  return { id, name: id, microcycles, deloadMicro: null, status: 'archived', createdAt, finishedAt: null, updatedAt: 0 };
}
function workout(p: Partial<Workout>): Workout {
  return { id: 'w', mesocycleId: 'm1', dayId: 'd', micro: 1, date: '2026-11-01', startedAt: 0, finishedAt: 1, durationSec: 3600, status: 'done', backfilled: false, notes: '', updatedAt: 0, ...p };
}
function set(p: Partial<SetLog>): SetLog {
  return { id: Math.random().toString(), workoutId: 'w', workoutExerciseId: 'we', exerciseId: 'bench_press', index: 0, kind: 'work', weight: 100, reps: 5, rir: 9, drops: [], done: true, updatedAt: 0, ...p };
}
function ws(mesocycleId: string, micro: number, sets: Partial<SetLog>[], id = `${mesocycleId}-${micro}`): WorkoutSets {
  return { workout: workout({ id, mesocycleId, micro }), sets: sets.map((s) => set({ workoutId: id, ...s })) };
}
function pr(mesocycleId: string): PrRecord {
  return { id: Math.random().toString(), exerciseId: 'bench_press', e1rm: 100, weight: 100, reps: 5, mesocycleId, workoutId: 'w', micro: 1, date: '2026-11-01', updatedAt: 0 };
}
function input(data: WorkoutSets[], prs: PrRecord[] = []): CompareInput {
  return { data, exercises, prs, bodyWeightKg: null };
}

const m1 = meso('m1', 1);
const m2 = meso('m2', 2);

describe('compareMesocycles', () => {
  it('récords: cuenta los PR de cada mesociclo', () => {
    const r = compareMesocycles(m1, m2, input([], [pr('m1'), pr('m1'), pr('m2'), pr('m2'), pr('m2')]));
    expect(r.records).toEqual({ a: 2, b: 3 });
  });

  it('grupos: puntuación en cada lado, null si falta y sin fila si no hay en ninguno', () => {
    const data = [
      ws('m1', 1, [{ weight: 80, reps: 8 }]),
      ws('m1', 2, [{ weight: 85, reps: 8 }]),
      ws('m2', 1, [{ weight: 90, reps: 8 }]),
      ws('m2', 2, [{ weight: 95, reps: 8 }]),
      ws('m2', 3, [{ exerciseId: 'squat', weight: 100, reps: 5 }], 'm2-sq'),
    ];
    const r = compareMesocycles(m1, m2, input(data));
    const chest = r.groups.find((g) => g.group === 'chest')!;
    expect(chest.a).not.toBeNull();
    expect(chest.b).not.toBeNull();
    const quads = r.groups.find((g) => g.group === 'quads')!;
    expect(quads.a).toBeNull();
    expect(quads.b).not.toBeNull();
    expect(r.groups.find((g) => g.group === 'biceps')).toBeUndefined();
  });

  it('comunes: solo ejercicios con 1RM > 0 en ambos, con el % de cambio', () => {
    const data = [
      ws('m1', 1, [{ weight: 100, reps: 1 }]),
      ws('m1', 2, [{ exerciseId: 'squat', weight: 100, reps: 1 }], 'm1-sq'),
      ws('m2', 1, [{ weight: 120, reps: 1 }]),
    ];
    const r = compareMesocycles(m1, m2, input(data));
    expect(r.common.map((c) => c.exerciseId)).toEqual(['bench_press']);
    expect(r.common[0].changePct).toBeCloseTo(((r.common[0].b - r.common[0].a) / r.common[0].a) * 100, 5);
    expect(r.common[0].changePct).toBeCloseTo(20, 5);
  });

  it('comunes: orden por cambio absoluto, mayor primero', () => {
    const data = [
      ws('m1', 1, [{ weight: 100, reps: 1 }]),
      ws('m1', 2, [{ exerciseId: 'squat', weight: 100, reps: 1 }], 'm1-sq'),
      ws('m2', 1, [{ weight: 120, reps: 1 }]),
      ws('m2', 2, [{ exerciseId: 'squat', weight: 70, reps: 1 }], 'm2-sq'),
    ];
    const r = compareMesocycles(m1, m2, input(data));
    expect(r.common.map((c) => c.exerciseId)).toEqual(['squat', 'bench_press']);
  });

  it('una serie sin peso o con 0 repeticiones no crea ejercicio común ni NaN', () => {
    const data = [
      ws('m1', 1, [{ weight: null, reps: 5 }]),
      ws('m2', 1, [{ weight: 100, reps: 0 }]),
    ];
    const r = compareMesocycles(m1, m2, input(data));
    expect(r.common).toEqual([]);
    expect(r.groups.every((g) => !Number.isNaN(g.a ?? 0) && !Number.isNaN(g.b ?? 0))).toBe(true);
  });
});

describe('pickDefaultPair', () => {
  it('B es el más reciente con entrenos y A el anterior', () => {
    const m3 = meso('m3', 3);
    const data = [ws('m1', 1, [{}]), ws('m2', 1, [{}])];
    const pair = pickDefaultPair([m1, m2, m3], data)!;
    expect(pair.a.id).toBe('m1');
    expect(pair.b.id).toBe('m2');
  });
  it('con un solo mesociclo con entrenos devuelve null', () => {
    expect(pickDefaultPair([m1, m2], [ws('m1', 1, [{}])])).toBeNull();
  });
});

describe('microSeries', () => {
  const data = [ws('m1', 1, [{ weight: 100, reps: 1 }]), ws('m1', 3, [{ weight: 110, reps: 1 }])];
  it('e1rm: recorta los microciclos finales sin datos y deja los huecos', () => {
    const s = microSeries('bench_press', m1, data, 'e1rm');
    expect(s.map((p) => p.label)).toEqual(['S1', 'S2', 'S3']);
    expect(s[1].value).toBe(0);
    expect(s[2].value).toBeGreaterThan(s[0].value);
  });
  it('volume: delega en el volumen por microciclo', () => {
    const s = microSeries('bench_press', m1, data, 'volume');
    expect(s.map((p) => p.value)).toEqual([100, 0, 110]);
  });
});
