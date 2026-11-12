import { describe, expect, it } from 'vitest';
import {
  bodyWeightsSync,
  customExercisesSync,
  mesocyclesSync,
  plannedSync,
  prsSync,
  setsSync,
  workoutsSync,
} from '../src/data/syncMap';
import type { BodyWeight, Exercise, Mesocycle, PlannedExercise, PrRecord, SetLog, Workout } from '../src/domain/types';

describe('conversión local ↔ nube (ida y vuelta)', () => {
  it('mesociclo', () => {
    const m: Mesocycle = {
      id: 'a', name: 'Hipertrofia', microcycles: 6, deloadMicro: 6, status: 'active',
      createdAt: 1731000000000, finishedAt: null, updatedAt: 1731000500000,
    };
    expect(mesocyclesSync.toLocal(mesocyclesSync.toRemote(m))).toEqual(m);
  });

  it('mesociclo terminado conserva la fecha de fin', () => {
    const m: Mesocycle = {
      id: 'b', name: 'X', microcycles: 4, deloadMicro: null, status: 'archived',
      createdAt: 1731000000000, finishedAt: 1731600000000, updatedAt: 1731600000000,
    };
    const back = mesocyclesSync.toLocal(mesocyclesSync.toRemote(m));
    expect(back).toEqual(m);
    expect(back.finishedAt).toBe(1731600000000);
  });

  it('columnas en snake_case en la nube', () => {
    const r = mesocyclesSync.toRemote({
      id: 'a', name: 'X', microcycles: 6, deloadMicro: 6, status: 'active',
      createdAt: 1731000000000, finishedAt: null, updatedAt: 1731000000000,
    });
    expect(r.deload_micro).toBe(6);
    expect(typeof r.created_at).toBe('string');
    expect(r.created_at).toBe(new Date(1731000000000).toISOString());
  });

  it('ejercicio planificado con variaciones por microciclo', () => {
    const p: PlannedExercise = {
      id: 'p', mesocycleId: 'm', dayId: 'd', order: 2, exerciseId: 'bench_press',
      sets: 4, repMin: 6, repMax: 8, targetRir: 9, restSec: 150, notes: 'tocar pecho',
      setsByMicro: { 3: 5 }, rirByMicro: { 3: 10 }, exerciseByMicro: { 2: 'db_bench_press' },
      updatedAt: 1731000000000,
    };
    expect(plannedSync.toLocal(plannedSync.toRemote(p))).toEqual(p);
  });

  it('serie con dropset y RIR', () => {
    const s: SetLog = {
      id: 's', workoutId: 'w', workoutExerciseId: 'we', exerciseId: 'bench_press',
      index: 2, kind: 'work', weight: 82.5, reps: 8, rir: 9,
      drops: [{ weight: 60, reps: 6 }, { weight: 40, reps: 5 }], done: true, updatedAt: 1731000000000,
    };
    const back = setsSync.toLocal(setsSync.toRemote(s));
    expect(back).toEqual(s);
    expect(setsSync.toRemote(s).weight_kg).toBe(82.5);
    expect(setsSync.toRemote(s).position).toBe(2);
  });

  it('serie sin registrar (nulos)', () => {
    const s: SetLog = {
      id: 's', workoutId: 'w', workoutExerciseId: 'we', exerciseId: 'x',
      index: 0, kind: 'work', weight: null, reps: null, rir: null, drops: [], done: false, updatedAt: 10,
    };
    expect(setsSync.toLocal(setsSync.toRemote(s))).toEqual(s);
  });

  it('récord de 1RM', () => {
    const pr: PrRecord = {
      id: 'r', exerciseId: 'bench_press', e1rm: 104.5, weight: 82.5, reps: 8,
      date: '2026-11-12', workoutId: 'w', mesocycleId: 'm', micro: 2, updatedAt: 1731000000000,
    };
    const back = prsSync.toLocal(prsSync.toRemote(pr));
    expect(back).toEqual(pr);
    expect(prsSync.toRemote(pr).pr_date).toBe('2026-11-12');
    expect(prsSync.toRemote(pr).e1rm_kg).toBe(104.5);
  });

  it('entreno con fecha pasada', () => {
    const w: Workout = {
      id: 'w', mesocycleId: 'm', dayId: 'd', micro: 1, date: '2026-11-01',
      startedAt: 1730000000000, finishedAt: 1730003600000, durationSec: 3600,
      status: 'done', backfilled: true, notes: '', updatedAt: 1730003600000,
    };
    expect(workoutsSync.toLocal(workoutsSync.toRemote(w))).toEqual(w);
    expect(workoutsSync.toRemote(w).workout_date).toBe('2026-11-01');
  });

  it('peso corporal', () => {
    const b: BodyWeight = { id: 'b', date: '2026-11-12', kg: 78.5, updatedAt: 1731000000000 };
    expect(bodyWeightsSync.toLocal(bodyWeightsSync.toRemote(b))).toEqual(b);
  });

  it('ejercicio propio conserva músculos y marca de custom', () => {
    const e: Exercise = {
      id: 'c', nameEs: 'Mi ejercicio', nameEn: 'My exercise', group: 'chest', equipment: 'machine',
      primary: ['chest_mid'], secondary: ['delt_front', 'triceps'], unilateral: true, custom: true, updatedAt: 1731000000000,
    };
    const back = customExercisesSync.toLocal(customExercisesSync.toRemote(e));
    expect(back).toEqual(e);
    expect(customExercisesSync.toRemote(e).muscle_group).toBe('chest');
    expect(customExercisesSync.toRemote(e).primary_muscles).toEqual(['chest_mid']);
  });
});
