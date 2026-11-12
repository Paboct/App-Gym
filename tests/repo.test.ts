import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { ForjaDB, db, ensureCatalog, useDatabase } from '../src/data/db';
import {
  addPlanned,
  addSet,
  bestE1rmBefore,
  createMesocycle,
  currentMicro,
  deleteMesocycle,
  duplicateMesocycle,
  finishWorkout,
  previousSets,
  saveSet,
  startWorkout,
  substituteWorkoutExercise,
} from '../src/data/repo';
import { CATALOG } from '../src/data/catalog';
import { MUSCLES, GROUPS, EQUIPMENT } from '../src/domain/muscles';

let n = 0;
beforeEach(async () => {
  useDatabase(new ForjaDB(`test-${n++}`));
  await ensureCatalog();
});

async function setup() {
  const mesoId = await createMesocycle({ name: 'Hipertrofia 1', microcycles: 6, deload: true, dayNames: ['Torso', 'Pierna'] });
  const days = await db.days.where('mesocycleId').equals(mesoId).sortBy('order');
  const benchId = await addPlanned(days[0].id, 'bench_press', { sets: 4, repMin: 6, repMax: 8, targetRir: 9, restSec: 150, notes: '' });
  await addPlanned(days[0].id, 'db_row');
  return { mesoId, days, benchId };
}

async function doWorkout(mesoId: string, dayId: string, micro: number, weight: number, reps: number) {
  const id = await startWorkout(mesoId, dayId, micro);
  const sets = await db.sets.where('workoutId').equals(id).toArray();
  for (const s of sets.filter((x) => x.exerciseId === 'bench_press')) {
    await saveSet(s.id, { weight, reps, rir: 9, done: true });
  }
  return { id, result: await finishWorkout(id) };
}

describe('catálogo', () => {
  it('tiene ids únicos y datos válidos', () => {
    const ids = new Set(CATALOG.map((e) => e.id));
    expect(ids.size).toBe(CATALOG.length);
    expect(CATALOG.length).toBeGreaterThan(100);
    for (const e of CATALOG) {
      expect(e.nameEs, e.id).toBeTruthy();
      expect(e.nameEn, e.id).toBeTruthy();
      expect(GROUPS, e.id).toContain(e.group);
      expect(EQUIPMENT, e.id).toContain(e.equipment);
      expect(e.primary.length, e.id).toBeGreaterThan(0);
      for (const m of [...e.primary, ...e.secondary]) expect(MUSCLES, `${e.id}: ${m}`).toContain(m);
      for (const m of e.secondary) expect(e.primary, `${e.id}: ${m} repetido`).not.toContain(m);
    }
  });
});

describe('mesociclos', () => {
  it('crea el mesociclo con sus días y la descarga en la última semana', async () => {
    const { mesoId, days } = await setup();
    const meso = await db.mesocycles.get(mesoId);
    expect(meso).toMatchObject({ microcycles: 6, deloadMicro: 6, status: 'active' });
    expect(days.map((d) => d.name)).toEqual(['Torso', 'Pierna']);
  });

  it('solo hay un mesociclo activo: el anterior pasa al historial', async () => {
    const { mesoId } = await setup();
    const second = await createMesocycle({ name: 'Otro', microcycles: 4, deload: false, dayNames: ['A'] });
    expect((await db.mesocycles.get(mesoId))?.status).toBe('archived');
    expect((await db.mesocycles.get(second))?.status).toBe('active');
  });

  it('duplica la estructura sin los entrenos', async () => {
    const { mesoId, days } = await setup();
    await doWorkout(mesoId, days[0].id, 1, 80, 8);
    const copyId = await duplicateMesocycle(mesoId, 'Hipertrofia 2');
    const copyDays = await db.days.where('mesocycleId').equals(copyId).sortBy('order');
    expect(copyDays.map((d) => d.name)).toEqual(['Torso', 'Pierna']);
    expect(await db.planned.where('mesocycleId').equals(copyId).count()).toBe(2);
    expect(await db.workouts.where('mesocycleId').equals(copyId).count()).toBe(0);
    expect((await db.mesocycles.get(mesoId))?.status).toBe('archived');
  });

  it('al borrar se lleva días, plan, entrenos y récords', async () => {
    const { mesoId, days } = await setup();
    await doWorkout(mesoId, days[0].id, 1, 80, 8);
    await doWorkout(mesoId, days[0].id, 2, 85, 8);
    expect(await db.prs.count()).toBe(1);
    await deleteMesocycle(mesoId);
    expect(await db.days.count()).toBe(0);
    expect(await db.planned.count()).toBe(0);
    expect(await db.workouts.count()).toBe(0);
    expect(await db.sets.count()).toBe(0);
    expect(await db.prs.count()).toBe(0);
  });
});

describe('entrenos', () => {
  it('al empezar crea las series del plan de esa semana', async () => {
    const { mesoId, days } = await setup();
    const id = await startWorkout(mesoId, days[0].id, 1);
    const sets = await db.sets.where('workoutId').equals(id).toArray();
    expect(sets.filter((s) => s.exerciseId === 'bench_press')).toHaveLength(4);
    expect(sets.filter((s) => s.exerciseId === 'db_row')).toHaveLength(3);
    expect(sets.every((s) => !s.done && s.kind === 'work')).toBe(true);
  });

  it('en la semana de descarga crea la mitad de series', async () => {
    const { mesoId, days } = await setup();
    const id = await startWorkout(mesoId, days[0].id, 6);
    const sets = await db.sets.where('workoutId').equals(id).toArray();
    expect(sets.filter((s) => s.exerciseId === 'bench_press')).toHaveLength(2);
  });

  it('no abre dos entrenos a la vez', async () => {
    const { mesoId, days } = await setup();
    const a = await startWorkout(mesoId, days[0].id, 1);
    const b = await startWorkout(mesoId, days[1].id, 1);
    expect(b).toBe(a);
  });

  it('las series de aproximación se colocan antes de las efectivas', async () => {
    const { mesoId, days } = await setup();
    const id = await startWorkout(mesoId, days[0].id, 1);
    const we = (await db.workoutExercises.where('workoutId').equals(id).sortBy('order'))[0];
    await addSet(we.id, 'warmup');
    const sets = (await db.sets.where('workoutExerciseId').equals(we.id).toArray()).sort((a, b) => a.index - b.index);
    expect(sets.map((s) => s.kind)).toEqual(['warmup', 'work', 'work', 'work', 'work']);
    expect(sets.map((s) => s.index)).toEqual([0, 1, 2, 3, 4]);
  });

  it('al terminar descarta las series sin hacer', async () => {
    const { mesoId, days } = await setup();
    const { id } = await doWorkout(mesoId, days[0].id, 1, 80, 8);
    const sets = await db.sets.where('workoutId').equals(id).toArray();
    expect(sets).toHaveLength(4);
    expect(sets.every((s) => s.done)).toBe(true);
    expect((await db.workouts.get(id))?.status).toBe('done');
  });

  it('el primer entreno no da récord; mejorar el 1RM estimado sí, ligado al microciclo', async () => {
    const { mesoId, days } = await setup();
    const first = await doWorkout(mesoId, days[0].id, 1, 80, 8);
    expect(first.result.prs).toHaveLength(0);
    const second = await doWorkout(mesoId, days[0].id, 2, 82.5, 8);
    expect(second.result.prs).toHaveLength(1);
    expect(second.result.prs[0]).toMatchObject({ exerciseId: 'bench_press', weight: 82.5, reps: 8, micro: 2, mesocycleId: mesoId });
    const third = await doWorkout(mesoId, days[0].id, 3, 82.5, 7);
    expect(third.result.prs).toHaveLength(0);
    expect(await bestE1rmBefore('bench_press', 'ninguno')).toBeCloseTo(82.5 * (1 + 8 / 30), 4);
  });

  it('recupera las series de la semana anterior del mismo día', async () => {
    const { mesoId, days } = await setup();
    await doWorkout(mesoId, days[0].id, 1, 80, 8);
    const id = await startWorkout(mesoId, days[0].id, 2);
    const prev = await previousSets('bench_press', { id, dayId: days[0].id });
    expect(prev?.workout.micro).toBe(1);
    expect(prev?.sets).toHaveLength(4);
    expect(prev?.sets[0]).toMatchObject({ weight: 80, reps: 8 });
  });

  it('sustituir en el entreno "solo esta semana" no cambia las siguientes', async () => {
    const { mesoId, days, benchId } = await setup();
    const id = await startWorkout(mesoId, days[0].id, 2);
    const we = (await db.workoutExercises.where('workoutId').equals(id).sortBy('order'))[0];
    await substituteWorkoutExercise(we.id, 'db_bench_press', 'week');
    expect((await db.planned.get(benchId))?.exerciseByMicro).toEqual({ 2: 'db_bench_press' });
    const sets = await db.sets.where('workoutExerciseId').equals(we.id).toArray();
    expect(sets.every((s) => s.exerciseId === 'db_bench_press')).toBe(true);
  });

  it('sustituir "resto de semanas" cambia desde esa hasta el final', async () => {
    const { mesoId, days, benchId } = await setup();
    const id = await startWorkout(mesoId, days[0].id, 4);
    const we = (await db.workoutExercises.where('workoutId').equals(id).sortBy('order'))[0];
    await substituteWorkoutExercise(we.id, 'machine_chest_press', 'rest');
    expect(Object.keys((await db.planned.get(benchId))!.exerciseByMicro)).toEqual(['4', '5', '6']);
  });
});

describe('microciclo actual', () => {
  const meso = { microcycles: 6 } as never;
  it('empieza en el 1', () => {
    expect(currentMicro(meso, ['a', 'b'], [])).toBe(1);
  });
  it('sigue en el mismo mientras queden días', () => {
    expect(currentMicro(meso, ['a', 'b'], [{ dayId: 'a', micro: 1 }])).toBe(1);
  });
  it('pasa al siguiente al completar todos los días', () => {
    expect(currentMicro(meso, ['a', 'b'], [{ dayId: 'a', micro: 1 }, { dayId: 'b', micro: 1 }])).toBe(2);
  });
  it('no se pasa del último', () => {
    expect(currentMicro(meso, ['a'], [{ dayId: 'a', micro: 6 }])).toBe(6);
  });
});
