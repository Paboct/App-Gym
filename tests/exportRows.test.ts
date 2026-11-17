import { describe, expect, it } from 'vitest';
import {
  buildProgressRows,
  buildRoutineRows,
  buildSetRows,
  sanitizeFileName,
  type ExportInput,
} from '../src/domain/exportRows';
import type { Exercise, SetLog } from '../src/domain/types';

const ex = (id: string, nameEs: string, nameEn: string): Exercise => ({
  id, nameEs, nameEn, group: 'chest', equipment: 'barbell', muscles: [{ id: 'pectoral_esternal', role: 'principal', activation: 1 }],
  unilateral: false, custom: false, updatedAt: 0,
});

type SetBase = Pick<SetLog, 'id' | 'workoutId' | 'workoutExerciseId' | 'exerciseId' | 'index'>;
const set = (p: Partial<SetLog> & SetBase): SetLog => ({
  kind: 'work', weight: 80, reps: 8, rir: 9, drops: [], done: true, updatedAt: 0, ...p,
});

function base(): ExportInput {
  return {
    meso: { id: 'm1', name: 'Meso 1', microcycles: 6, deloadMicro: 6, status: 'active', createdAt: 0, finishedAt: null, updatedAt: 0 },
    days: [{ id: 'd1', mesocycleId: 'm1', order: 1, name: 'Pecho', updatedAt: 0 }],
    planned: [
      {
        id: 'p1', mesocycleId: 'm1', dayId: 'd1', order: 1, exerciseId: 'bench', sets: 4, repMin: 6, repMax: 8,
        targetRir: 9, restSec: 150, notes: 'pausa', setsByMicro: { 2: 5 }, rirByMicro: {}, exerciseByMicro: {}, updatedAt: 0,
      },
    ],
    workouts: [
      { id: 'w1', mesocycleId: 'm1', dayId: 'd1', micro: 1, date: '2026-11-02', startedAt: 0, finishedAt: 1, durationSec: 60, status: 'done', backfilled: false, notes: '', updatedAt: 0 },
      { id: 'w2', mesocycleId: 'm1', dayId: 'd1', micro: 2, date: '2026-11-09', startedAt: 0, finishedAt: null, durationSec: 0, status: 'in_progress', backfilled: false, notes: '', updatedAt: 0 },
    ],
    workoutExercises: [
      { id: 'we1', workoutId: 'w1', plannedExerciseId: 'p1', exerciseId: 'bench', order: 1, repMin: 6, repMax: 8, targetRir: 9, restSec: 150, notes: '', updatedAt: 0 },
      { id: 'we2', workoutId: 'w2', plannedExerciseId: 'p1', exerciseId: 'bench', order: 1, repMin: 6, repMax: 8, targetRir: 9, restSec: 150, notes: '', updatedAt: 0 },
    ],
    sets: [
      set({ id: 's0', workoutId: 'w1', workoutExerciseId: 'we1', exerciseId: 'bench', index: 0, kind: 'warmup', weight: 40, reps: 10, rir: null }),
      set({ id: 's1', workoutId: 'w1', workoutExerciseId: 'we1', exerciseId: 'bench', index: 1 }),
      set({ id: 's2', workoutId: 'w1', workoutExerciseId: 'we1', exerciseId: 'bench', index: 2, reps: 6, rir: 10, drops: [{ weight: 60, reps: 8 }, { weight: 45, reps: 10 }] }),
      set({ id: 's3', workoutId: 'w1', workoutExerciseId: 'we1', exerciseId: 'bench', index: 3, done: false }),
      set({ id: 's4', workoutId: 'w2', workoutExerciseId: 'we2', exerciseId: 'bench', index: 1 }),
    ],
    exercises: new Map([
      ['bench', ex('bench', 'Press de banca', 'Bench press')],
      ['inc', ex('inc', 'Press inclinado', 'Incline press')],
    ]),
    unit: 'kg',
    lang: 'es',
  };
}

describe('buildRoutineRows', () => {
  it('una fila por ejercicio planificado, con el rango "6–8" y las series base', () => {
    expect(buildRoutineRows(base())).toEqual([
      { day: 1, dayName: 'Pecho', exercise: 'Press de banca', sets: 4, reps: '6–8', rir: 9, restSec: 150, notes: 'pausa' },
    ]);
  });
});

describe('buildSetRows', () => {
  it('ignora entrenos en curso y series sin hacer', () => {
    const rows = buildSetRows(base());
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.micro === 1)).toBe(true);
  });

  it('la aproximación no suma volumen y se numera aparte', () => {
    const [warm, work1] = buildSetRows(base());
    expect(warm).toMatchObject({ kind: 'warmup', setNo: 1, volume: 0, weight: 40 });
    expect(work1).toMatchObject({ kind: 'work', setNo: 1, volume: 640 });
  });

  it('escribe el dropset en orden como "60×8 + 45×10" sin sumarlo al volumen', () => {
    const rows = buildSetRows(base());
    expect(rows[2].drops).toBe('60×8 + 45×10');
    expect(rows[2].volume).toBe(480);
  });

  it('convierte a libras cuando la unidad es lb', () => {
    const rows = buildSetRows({ ...base(), unit: 'lb' });
    expect(rows[1].weight).toBeCloseTo(176.5, 1);
  });

  it('un mesociclo sin entrenos devuelve []', () => {
    expect(buildSetRows({ ...base(), workouts: [], sets: [] })).toEqual([]);
  });

  it('peso null no produce NaN', () => {
    const input = base();
    input.sets = [set({ id: 'sn', workoutId: 'w1', workoutExerciseId: 'we1', exerciseId: 'bench', index: 1, weight: null })];
    const [row] = buildSetRows(input);
    expect(row.weight).toBeNull();
    expect(Number.isNaN(row.volume)).toBe(false);
  });
});

describe('buildProgressRows', () => {
  it('calcula por ejercicio y microciclo solo con series efectivas', () => {
    const rows = buildProgressRows(base());
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ exerciseId: 'bench', exercise: 'Press de banca', micro: 1, maxWeight: 80, volume: 1120, sets: 2 });
    expect(rows[0].e1rm).toBeCloseTo(101.3, 1);
  });

  it('usa el ejercicio realmente hecho si fue sustituido', () => {
    const input = base();
    input.sets = input.sets.map((s) => ({ ...s, exerciseId: 'inc' }));
    expect(buildProgressRows(input).map((r) => r.exerciseId)).toEqual(['inc']);
  });

  it('sin entrenos devuelve []', () => {
    expect(buildProgressRows({ ...base(), workouts: [], sets: [] })).toEqual([]);
  });
});

describe('sanitizeFileName', () => {
  it('quita caracteres no válidos y espacios dobles', () => {
    expect(sanitizeFileName('A/B:C?')).toBe('A B C');
  });
  it('recorta a 80 caracteres', () => {
    expect(sanitizeFileName('x'.repeat(200))).toHaveLength(80);
  });
  it('un nombre vacío da "mesociclo"', () => {
    expect(sanitizeFileName('  ?? ')).toBe('mesociclo');
  });
});
