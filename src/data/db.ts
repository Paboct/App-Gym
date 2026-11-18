import Dexie, { type Table } from 'dexie';
import type {
  BodyWeight,
  Deletion,
  Exercise,
  Favorite,
  Mesocycle,
  PlannedExercise,
  PrRecord,
  RoutineDay,
  SetLog,
  Workout,
  WorkoutExercise,
} from '../domain/types';
import { convertLegacyMuscles, ensurePrincipal } from '../domain/legacyMuscles';
import type { GroupId } from '../domain/muscles';
import { CATALOG } from './catalog';

export interface SettingRow {
  key: string;
  value: unknown;
}

/**
 * Base de datos local (IndexedDB). La app funciona siempre contra ella, con o
 * sin conexión; la sincronización con la nube se monta encima.
 */
export class LegacyDB extends Dexie {
  exercises!: Table<Exercise, string>;
  favorites!: Table<Favorite, string>;
  mesocycles!: Table<Mesocycle, string>;
  days!: Table<RoutineDay, string>;
  planned!: Table<PlannedExercise, string>;
  workouts!: Table<Workout, string>;
  workoutExercises!: Table<WorkoutExercise, string>;
  sets!: Table<SetLog, string>;
  prs!: Table<PrRecord, string>;
  bodyWeights!: Table<BodyWeight, string>;
  settings!: Table<SettingRow, string>;
  deletions!: Table<Deletion, string>;

  constructor(name = 'legacy') {
    super(name);
    this.version(1).stores({
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
    });
    // v2: los músculos pasan de listas principal/secundario (22 ids) a
    // `muscles` con activación (35 ids). Los índices no cambian.
    this.version(2)
      .stores({})
      .upgrade((tx) =>
        tx
          .table('exercises')
          .toCollection()
          .modify((e: Record<string, unknown>) => {
            if (!('primary' in e) && !('secondary' in e)) return;
            const primary = Array.isArray(e.primary) ? (e.primary as string[]) : [];
            const secondary = Array.isArray(e.secondary) ? (e.secondary as string[]) : [];
            if (!Array.isArray(e.muscles) || e.muscles.length === 0) {
              e.muscles = ensurePrincipal(convertLegacyMuscles(primary, secondary), e.group as GroupId);
            }
            delete e.primary;
            delete e.secondary;
          }),
      );
  }
}

export let db = new LegacyDB();

/** Solo para tests: sustituye la base de datos por una limpia. */
export function useDatabase(instance: LegacyDB): void {
  db = instance;
}

/** Carga o actualiza el catálogo de ejercicios (no toca los creados por el usuario). */
export async function ensureCatalog(): Promise<void> {
  await db.exercises.bulkPut(CATALOG);
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
