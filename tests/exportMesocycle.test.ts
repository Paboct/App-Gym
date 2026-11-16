import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { LegacyDB, db, ensureCatalog, useDatabase } from '../src/data/db';
import { exportFileName, loadExportInput } from '../src/data/exportMesocycle';
import { addPlanned, createMesocycle, finishWorkout, saveSet, startWorkout } from '../src/data/repo';
import { buildProgressRows, buildSetRows } from '../src/domain/exportRows';

let n = 0;
beforeEach(async () => {
  useDatabase(new LegacyDB(`export-test-${n++}`));
  await ensureCatalog();
});

async function setup() {
  const mesoId = await createMesocycle({ name: 'Hipertrofia: 1/2', microcycles: 6, deload: true, dayNames: ['Torso'] });
  const days = await db.days.where('mesocycleId').equals(mesoId).sortBy('order');
  await addPlanned(days[0].id, 'bench_press', { sets: 3, repMin: 6, repMax: 8, targetRir: 9, restSec: 150, notes: '' });
  return { mesoId, dayId: days[0].id };
}

async function doneWorkout(mesoId: string, dayId: string, micro: number) {
  const id = await startWorkout(mesoId, dayId, micro);
  const sets = await db.sets.where('workoutId').equals(id).toArray();
  for (const s of sets) await saveSet(s.id, { weight: 80, reps: 8, rir: 9, done: true });
  await finishWorkout(id);
  return id;
}

describe('loadExportInput', () => {
  it('devuelve los días, lo planificado, los entrenos hechos y sus series', async () => {
    const { mesoId, dayId } = await setup();
    await doneWorkout(mesoId, dayId, 1);
    const input = await loadExportInput(mesoId, 'kg', 'es');
    expect(input).not.toBeNull();
    expect(input!.meso.id).toBe(mesoId);
    expect(input!.days).toHaveLength(1);
    expect(input!.planned).toHaveLength(1);
    expect(input!.workouts).toHaveLength(1);
    expect(input!.sets.length).toBeGreaterThan(0);
    expect(input!.exercises.get('bench_press')?.nameEs).toBeTruthy();
    expect(buildSetRows(input!).length).toBeGreaterThan(0);
    expect(buildProgressRows(input!)[0]).toMatchObject({ exerciseId: 'bench_press', micro: 1 });
  });

  it('no incluye entrenos en curso', async () => {
    const { mesoId, dayId } = await setup();
    await startWorkout(mesoId, dayId, 1);
    const input = await loadExportInput(mesoId, 'kg', 'es');
    expect(input!.workouts).toHaveLength(0);
    expect(input!.sets).toHaveLength(0);
  });

  it('un mesociclo sin entrenos devuelve el input con listas vacías', async () => {
    const { mesoId } = await setup();
    const input = await loadExportInput(mesoId, 'lb', 'en');
    expect(input).toMatchObject({ unit: 'lb', lang: 'en' });
    expect(input!.workouts).toEqual([]);
  });

  it('un id inexistente devuelve null', async () => {
    expect(await loadExportInput('no-existe', 'kg', 'es')).toBeNull();
  });
});

describe('exportFileName', () => {
  it('limpia el nombre y añade la extensión', () => {
    expect(exportFileName('Hipertrofia: 1/2')).toBe('Hipertrofia 1 2.xlsx');
  });
});
