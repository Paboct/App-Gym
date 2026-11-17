import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { LegacyDB, db, ensureCatalog, useDatabase } from '../src/data/db';

/** Esquema de la versión 1 tal cual se publicó (índices idénticos a los de hoy). */
const V1_STORES = {
  exercises: 'id, group, custom',
  favorites: 'exerciseId',
  mesocycles: 'id, status, createdAt',
  days: 'id, mesocycleId',
  planned: 'id, mesocycleId, dayId',
  workouts: 'id, mesocycleId, dayId, status, date',
  workoutExercises: 'id, workoutId, exerciseId',
  sets: 'id, workoutId, workoutExerciseId, exerciseId',
  prs: 'id, exerciseId, workoutId, mesocycleId',
  bodyWeights: 'id, date',
  settings: 'key',
  deletions: 'id, table',
};

async function seedV1(name: string) {
  const old = new Dexie(name);
  old.version(1).stores(V1_STORES);
  await old.open();
  await old.table('exercises').bulkPut([
    {
      id: 'mine', nameEs: 'Mi press', nameEn: 'My press', group: 'chest', equipment: 'machine',
      primary: ['chest_mid'], secondary: ['delt_front', 'triceps'], unilateral: false, custom: true, updatedAt: 5,
    },
    {
      id: 'ghost', nameEs: 'Fantasma', nameEn: 'Ghost', group: 'back', equipment: 'cable',
      primary: ['nope'], secondary: [], unilateral: false, custom: true, updatedAt: 6,
    },
    {
      id: 'soloSec', nameEs: 'Solo secundarios', nameEn: 'Secondary only', group: 'back', equipment: 'cable',
      primary: [], secondary: ['biceps'], unilateral: false, custom: true, updatedAt: 7,
    },
    {
      id: 'bench_press', nameEs: 'Press de banca', nameEn: 'Bench press', group: 'chest', equipment: 'barbell',
      primary: ['chest_mid'], secondary: ['chest_lower', 'delt_front', 'triceps'], unilateral: false, custom: false, updatedAt: 0,
    },
  ]);
  old.close();
}

describe('migración de Dexie a la versión 2 (músculos con activación)', () => {
  it('convierte el ejercicio propio antiguo y quita primary/secondary', async () => {
    await seedV1('mig-a');
    const fresh = new LegacyDB('mig-a');
    await fresh.open();
    expect(fresh.verno).toBe(2);
    const mine = (await fresh.exercises.get('mine')) as unknown as Record<string, unknown>;
    expect(mine.muscles).toEqual([
      { id: 'pectoral_esternal', role: 'principal', activation: 1 },
      { id: 'deltoides_anterior', role: 'secundario', activation: 0.5 },
      { id: 'triceps_larga', role: 'secundario', activation: 0.5 },
      { id: 'triceps_lateral', role: 'secundario', activation: 0.5 },
      { id: 'triceps_medial', role: 'secundario', activation: 0.5 },
    ]);
    expect('primary' in mine).toBe(false);
    expect('secondary' in mine).toBe(false);
    expect(mine).toMatchObject({ nameEs: 'Mi press', custom: true, updatedAt: 5 });
    fresh.close();
  });

  it('el ejercicio de catálogo guardado en formato antiguo no se rompe', async () => {
    await seedV1('mig-b');
    const fresh = new LegacyDB('mig-b');
    await fresh.open();
    const bench = await fresh.exercises.get('bench_press');
    expect(bench?.muscles.length).toBeGreaterThan(0);
    expect(bench?.muscles.some((m) => m.role === 'principal')).toBe(true);
    fresh.close();
  });

  it('ensureCatalog deja los 240 del catálogo con músculos y respeta los propios', async () => {
    await seedV1('mig-c');
    useDatabase(new LegacyDB('mig-c'));
    await ensureCatalog();
    const catalog = await db.exercises.filter((e) => !e.custom).toArray();
    expect(catalog).toHaveLength(240);
    expect(catalog.every((e) => Array.isArray(e.muscles) && e.muscles.length > 0)).toBe(true);
    const mine = await db.exercises.get('mine');
    expect(mine?.custom).toBe(true);
    expect(mine?.muscles[0]).toEqual({ id: 'pectoral_esternal', role: 'principal', activation: 1 });
    db.close();
  });

  it('red de seguridad: un ejercicio propio sin principal recibe el primer músculo de su grupo', async () => {
    await seedV1('mig-d');
    const fresh = new LegacyDB('mig-d');
    await fresh.open();
    const ghost = await fresh.exercises.get('ghost');
    expect(ghost?.muscles).toEqual([{ id: 'dorsal_ancho', role: 'principal', activation: 1 }]);
    const sec = await fresh.exercises.get('soloSec');
    expect(sec?.muscles.filter((m) => m.role === 'principal')).toEqual([{ id: 'dorsal_ancho', role: 'principal', activation: 1 }]);
    expect(sec?.muscles.some((m) => m.id === 'biceps_braquial' && m.role === 'secundario')).toBe(true);
    fresh.close();
  });
});
