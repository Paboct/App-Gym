import type {
  BodyWeight,
  Exercise,
  Mesocycle,
  PlannedExercise,
  PrRecord,
  RoutineDay,
  SetLog,
  Workout,
  WorkoutExercise,
} from '../domain/types';

/**
 * Conversión entre el modelo local (camelCase, fechas en ms) y el de la nube
 * (snake_case, fechas ISO). Cada tabla define cómo pasar una fila a la nube
 * (`toRemote`) y cómo volver (`toLocal`). Son funciones puras para poder
 * probarlas sin conexión.
 */

type Remote = Record<string, unknown>;

const iso = (ms: number): string => new Date(ms).toISOString();
const ms = (value: unknown): number => (value ? new Date(value as string).getTime() : 0);
const isoOrNull = (value: number | null): string | null => (value == null ? null : iso(value));
const msOrNull = (value: unknown): number | null => (value ? new Date(value as string).getTime() : null);

export interface TableSync<L extends { id: string; updatedAt: number }> {
  /** Nombre del almacén local (Dexie). */
  store: string;
  /** Nombre de la tabla en la nube (Supabase). */
  remote: string;
  toRemote(row: L): Remote;
  toLocal(row: Remote): L;
}

function table<L extends { id: string; updatedAt: number }>(t: TableSync<L>): TableSync<L> {
  return t;
}

export const mesocyclesSync = table<Mesocycle>({
  store: 'mesocycles',
  remote: 'mesocycles',
  toRemote: (m) => ({
    id: m.id,
    name: m.name,
    microcycles: m.microcycles,
    deload_micro: m.deloadMicro,
    status: m.status,
    created_at: iso(m.createdAt),
    finished_at: isoOrNull(m.finishedAt),
    updated_at: iso(m.updatedAt),
    deleted_at: null,
  }),
  toLocal: (r) => ({
    id: r.id as string,
    name: r.name as string,
    microcycles: r.microcycles as number,
    deloadMicro: (r.deload_micro as number | null) ?? null,
    status: r.status as Mesocycle['status'],
    createdAt: ms(r.created_at),
    finishedAt: msOrNull(r.finished_at),
    updatedAt: ms(r.updated_at),
  }),
});

export const daysSync = table<RoutineDay>({
  store: 'days',
  remote: 'routine_days',
  toRemote: (d) => ({
    id: d.id,
    mesocycle_id: d.mesocycleId,
    position: d.order,
    name: d.name,
    updated_at: iso(d.updatedAt),
    deleted_at: null,
  }),
  toLocal: (r) => ({
    id: r.id as string,
    mesocycleId: r.mesocycle_id as string,
    order: r.position as number,
    name: r.name as string,
    updatedAt: ms(r.updated_at),
  }),
});

export const plannedSync = table<PlannedExercise>({
  store: 'planned',
  remote: 'planned_exercises',
  toRemote: (p) => ({
    id: p.id,
    mesocycle_id: p.mesocycleId,
    day_id: p.dayId,
    position: p.order,
    exercise_id: p.exerciseId,
    sets: p.sets,
    rep_min: p.repMin,
    rep_max: p.repMax,
    target_rir: p.targetRir,
    rest_sec: p.restSec,
    notes: p.notes,
    sets_by_micro: p.setsByMicro,
    rir_by_micro: p.rirByMicro,
    exercise_by_micro: p.exerciseByMicro,
    updated_at: iso(p.updatedAt),
    deleted_at: null,
  }),
  toLocal: (r) => ({
    id: r.id as string,
    mesocycleId: r.mesocycle_id as string,
    dayId: r.day_id as string,
    order: r.position as number,
    exerciseId: r.exercise_id as string,
    sets: r.sets as number,
    repMin: r.rep_min as number,
    repMax: r.rep_max as number,
    targetRir: (r.target_rir as PlannedExercise['targetRir']) ?? null,
    restSec: r.rest_sec as number,
    notes: (r.notes as string) ?? '',
    setsByMicro: (r.sets_by_micro as PlannedExercise['setsByMicro']) ?? {},
    rirByMicro: (r.rir_by_micro as PlannedExercise['rirByMicro']) ?? {},
    exerciseByMicro: (r.exercise_by_micro as PlannedExercise['exerciseByMicro']) ?? {},
    updatedAt: ms(r.updated_at),
  }),
});

export const workoutsSync = table<Workout>({
  store: 'workouts',
  remote: 'workouts',
  toRemote: (w) => ({
    id: w.id,
    mesocycle_id: w.mesocycleId,
    day_id: w.dayId,
    micro: w.micro,
    workout_date: w.date,
    started_at: iso(w.startedAt),
    finished_at: isoOrNull(w.finishedAt),
    duration_sec: w.durationSec,
    status: w.status,
    backfilled: w.backfilled,
    notes: w.notes,
    updated_at: iso(w.updatedAt),
    deleted_at: null,
  }),
  toLocal: (r) => ({
    id: r.id as string,
    mesocycleId: r.mesocycle_id as string,
    dayId: r.day_id as string,
    micro: r.micro as number,
    date: r.workout_date as string,
    startedAt: ms(r.started_at),
    finishedAt: msOrNull(r.finished_at),
    durationSec: r.duration_sec as number,
    status: r.status as Workout['status'],
    backfilled: (r.backfilled as boolean) ?? false,
    notes: (r.notes as string) ?? '',
    updatedAt: ms(r.updated_at),
  }),
});

export const workoutExercisesSync = table<WorkoutExercise>({
  store: 'workoutExercises',
  remote: 'workout_exercises',
  toRemote: (w) => ({
    id: w.id,
    workout_id: w.workoutId,
    planned_exercise_id: w.plannedExerciseId,
    exercise_id: w.exerciseId,
    position: w.order,
    rep_min: w.repMin,
    rep_max: w.repMax,
    target_rir: w.targetRir,
    rest_sec: w.restSec,
    notes: w.notes,
    updated_at: iso(w.updatedAt),
    deleted_at: null,
  }),
  toLocal: (r) => ({
    id: r.id as string,
    workoutId: r.workout_id as string,
    plannedExerciseId: (r.planned_exercise_id as string | null) ?? null,
    exerciseId: r.exercise_id as string,
    order: r.position as number,
    repMin: r.rep_min as number,
    repMax: r.rep_max as number,
    targetRir: (r.target_rir as WorkoutExercise['targetRir']) ?? null,
    restSec: r.rest_sec as number,
    notes: (r.notes as string) ?? '',
    updatedAt: ms(r.updated_at),
  }),
});

export const setsSync = table<SetLog>({
  store: 'sets',
  remote: 'set_logs',
  toRemote: (s) => ({
    id: s.id,
    workout_id: s.workoutId,
    workout_exercise_id: s.workoutExerciseId,
    exercise_id: s.exerciseId,
    position: s.index,
    kind: s.kind,
    weight_kg: s.weight,
    reps: s.reps,
    rir: s.rir,
    drops: s.drops,
    done: s.done,
    updated_at: iso(s.updatedAt),
    deleted_at: null,
  }),
  toLocal: (r) => ({
    id: r.id as string,
    workoutId: r.workout_id as string,
    workoutExerciseId: r.workout_exercise_id as string,
    exerciseId: r.exercise_id as string,
    index: r.position as number,
    kind: r.kind as SetLog['kind'],
    weight: (r.weight_kg as number | null) ?? null,
    reps: (r.reps as number | null) ?? null,
    rir: (r.rir as SetLog['rir']) ?? null,
    drops: (r.drops as SetLog['drops']) ?? [],
    done: (r.done as boolean) ?? false,
    updatedAt: ms(r.updated_at),
  }),
});

export const prsSync = table<PrRecord>({
  store: 'prs',
  remote: 'pr_records',
  toRemote: (p) => ({
    id: p.id,
    exercise_id: p.exerciseId,
    e1rm_kg: p.e1rm,
    weight_kg: p.weight,
    reps: p.reps,
    pr_date: p.date,
    workout_id: p.workoutId,
    mesocycle_id: p.mesocycleId,
    micro: p.micro,
    updated_at: iso(p.updatedAt),
    deleted_at: null,
  }),
  toLocal: (r) => ({
    id: r.id as string,
    exerciseId: r.exercise_id as string,
    e1rm: r.e1rm_kg as number,
    weight: r.weight_kg as number,
    reps: r.reps as number,
    date: r.pr_date as string,
    workoutId: r.workout_id as string,
    mesocycleId: r.mesocycle_id as string,
    micro: r.micro as number,
    updatedAt: ms(r.updated_at),
  }),
});

export const bodyWeightsSync = table<BodyWeight>({
  store: 'bodyWeights',
  remote: 'body_weights',
  toRemote: (b) => ({
    id: b.id,
    weight_date: b.date,
    kg: b.kg,
    updated_at: iso(b.updatedAt),
    deleted_at: null,
  }),
  toLocal: (r) => ({
    id: r.id as string,
    date: r.weight_date as string,
    kg: r.kg as number,
    updatedAt: ms(r.updated_at),
  }),
});

/** Solo los ejercicios creados por el usuario viajan a la nube; el catálogo vive en la app. */
export const customExercisesSync = table<Exercise>({
  store: 'exercises',
  remote: 'custom_exercises',
  toRemote: (e) => ({
    id: e.id,
    name_es: e.nameEs,
    name_en: e.nameEn,
    muscle_group: e.group,
    equipment: e.equipment,
    primary_muscles: e.primary,
    secondary_muscles: e.secondary,
    unilateral: e.unilateral,
    updated_at: iso(e.updatedAt),
    deleted_at: null,
  }),
  toLocal: (r) => ({
    id: r.id as string,
    nameEs: r.name_es as string,
    nameEn: r.name_en as string,
    group: r.muscle_group as Exercise['group'],
    equipment: r.equipment as Exercise['equipment'],
    primary: (r.primary_muscles as Exercise['primary']) ?? [],
    secondary: (r.secondary_muscles as Exercise['secondary']) ?? [],
    unilateral: (r.unilateral as boolean) ?? false,
    custom: true,
    updatedAt: ms(r.updated_at),
  }),
});

/** Tablas que se sincronizan por filas con marca de tiempo, en orden de dependencias (padres primero). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SYNC_TABLES: TableSync<any>[] = [
  customExercisesSync,
  mesocyclesSync,
  daysSync,
  plannedSync,
  workoutsSync,
  workoutExercisesSync,
  setsSync,
  prsSync,
  bodyWeightsSync,
];

export const toIso = iso;
export const fromIso = ms;
