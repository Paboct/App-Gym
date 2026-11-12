import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import {
  TIERS,
  avgDurationSec,
  groupByWorkout,
  groupScore,
  groupWeight,
  recordStats,
  tierForScore,
  volumeByMicro,
  volumeGlobal,
  weekStreak,
  type ScoreContext,
  type WorkoutSets,
} from '../src/domain/kpi';
import type { Exercise, Mesocycle, PrRecord, SetLog, Workout } from '../src/domain/types';

const byId = new Map(CATALOG.map((e) => [e.id, e]));
const ex = (id: string): Exercise => byId.get(id)!;

function workout(p: Partial<Workout>): Workout {
  return { id: 'w', mesocycleId: 'm', dayId: 'd', micro: 1, date: '2026-11-01', startedAt: 0, finishedAt: 1, durationSec: 3600, status: 'done', backfilled: false, notes: '', updatedAt: 0, ...p };
}
function set(p: Partial<SetLog>): SetLog {
  return { id: Math.random().toString(), workoutId: 'w', workoutExerciseId: 'we', exerciseId: 'bench_press', index: 0, kind: 'work', weight: 100, reps: 5, rir: 9, drops: [], done: true, updatedAt: 0, ...p };
}

describe('peso de un ejercicio sobre un grupo', () => {
  it('press de banca es principal de pecho y secundario de tríceps', () => {
    expect(groupWeight(ex('bench_press'), 'chest')).toBe(1);
    expect(groupWeight(ex('bench_press'), 'triceps')).toBe(0.5);
    expect(groupWeight(ex('bench_press'), 'quads')).toBe(0);
  });
});

describe('rangos', () => {
  it('asigna el rango según la puntuación', () => {
    expect(tierForScore(0)?.id).toBe('iron');
    expect(tierForScore(45)?.id).toBe('gold');
    expect(tierForScore(65)?.id).toBe('emerald');
    expect(tierForScore(90)?.id).toBe('amethyst');
    expect(tierForScore(95)?.id).toBe('legacy');
    expect(tierForScore(null)).toBeNull();
  });
  it('los umbrales van de menor a mayor', () => {
    for (let i = 1; i < TIERS.length; i++) expect(TIERS[i].min).toBeGreaterThan(TIERS[i - 1].min);
  });
});

describe('series de volumen', () => {
  const meso = { id: 'm', microcycles: 3 } as Mesocycle;
  const data: WorkoutSets[] = [
    { workout: workout({ micro: 1, date: '2026-11-01' }), sets: [set({ weight: 80, reps: 10 }), set({ weight: 80, reps: 10 })] },
    { workout: workout({ id: 'w2', micro: 2, date: '2026-11-08' }), sets: [set({ workoutId: 'w2', weight: 85, reps: 10 })] },
  ];
  it('volumen por microciclo cubre todas las semanas del meso', () => {
    const s = volumeByMicro('bench_press', meso, data);
    expect(s.map((p) => p.value)).toEqual([1600, 850]);
    expect(s.map((p) => p.label)).toEqual(['S1', 'S2']);
  });
  it('volumen global omite sesiones sin ese ejercicio', () => {
    const s = volumeGlobal('bench_press', data);
    expect(s).toHaveLength(2);
    expect(s[0].value).toBe(1600);
  });
});

describe('puntuación de grupo', () => {
  const meso = { id: 'm', microcycles: 4 } as Mesocycle;
  function ctx(data: WorkoutSets[], bw: number | null): ScoreContext {
    return { data, exercises: byId, bodyWeightKg: bw, meso, weeks: 4 };
  }
  it('mejorar el 1RM a lo largo de los microciclos sube el progreso', () => {
    const data: WorkoutSets[] = [
      { workout: workout({ micro: 1 }), sets: [set({ weight: 80, reps: 8 })] },
      { workout: workout({ id: 'w2', micro: 4 }), sets: [set({ workoutId: 'w2', weight: 90, reps: 8 })] },
    ];
    const sc = groupScore(ctx(data, null), 'chest');
    expect(sc.progress).not.toBeNull();
    expect(sc.progress!).toBeGreaterThan(50); // hubo mejora
    expect(sc.strength).toBeNull(); // sin peso corporal
  });
  it('sin datos del grupo la puntuación es null', () => {
    const data: WorkoutSets[] = [{ workout: workout({}), sets: [set({ exerciseId: 'squat' })] }];
    expect(groupScore(ctx(data, 80), 'biceps').score).toBeNull();
  });
  it('la fuerza relativa usa el peso corporal', () => {
    const data: WorkoutSets[] = [
      { workout: workout({ micro: 1 }), sets: [set({ weight: 100, reps: 1 })] },
      { workout: workout({ id: 'w2', micro: 2 }), sets: [set({ workoutId: 'w2', weight: 110, reps: 1 })] },
    ];
    const sc = groupScore(ctx(data, 80), 'chest');
    expect(sc.strength).not.toBeNull();
    expect(sc.score).not.toBeNull();
  });
});

describe('récords', () => {
  const prs: PrRecord[] = [
    { id: 'a', exerciseId: 'bench_press', e1rm: 100, weight: 80, reps: 8, date: '2026-11-01', workoutId: 'w1', mesocycleId: 'm1', micro: 1, updatedAt: 1 },
    { id: 'b', exerciseId: 'squat', e1rm: 150, weight: 120, reps: 8, date: '2026-11-08', workoutId: 'w2', mesocycleId: 'm1', micro: 2, updatedAt: 2 },
    { id: 'c', exerciseId: 'db_row', e1rm: 60, weight: 40, reps: 10, date: '2026-11-09', workoutId: 'w3', mesocycleId: 'm1', micro: 2, updatedAt: 3 },
  ];
  it('cuenta total, por mesociclo y por microciclo', () => {
    const r = recordStats(prs);
    expect(r.total).toBe(3);
    expect(r.byMesocycle[0]).toEqual({ mesocycleId: 'm1', count: 3 });
    expect(r.byMicro[0]).toEqual({ mesocycleId: 'm1', micro: 2, count: 2 });
    expect(r.recent[0].id).toBe('c'); // el más reciente primero
  });
});

describe('otros KPIs', () => {
  it('duración media ignora los registrados a posteriori', () => {
    const ws = [workout({ durationSec: 3600 }), workout({ id: 'b', durationSec: 0, backfilled: true }), workout({ id: 'c', durationSec: 5400 })];
    expect(avgDurationSec(ws)).toBe(4500);
  });
  it('racha de semanas seguidas', () => {
    const ws = [workout({ date: '2026-11-02' }), workout({ id: 'b', date: '2026-10-27' }), workout({ id: 'c', date: '2026-10-20' }), workout({ id: 'd', date: '2026-10-01' })];
    expect(weekStreak(ws)).toBe(3); // tres semanas seguidas, luego hay un hueco
  });
  it('agrupar por entreno descarta aproximación y no terminadas', () => {
    const ws = [workout({})];
    const sets = [set({ kind: 'warmup' }), set({ done: false }), set({ weight: 80, reps: 10 })];
    const g = groupByWorkout(ws, sets);
    expect(g[0].sets).toHaveLength(1);
  });
});
