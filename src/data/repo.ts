import { bestSet, effectivePlan, isNewPr, setE1rm, todayIso } from '../domain/calc';
import type { EquipmentId, GroupId, MuscleId } from '../domain/muscles';
import {
  DEFAULT_SETTINGS,
  type BodyWeight,
  type Exercise,
  type Mesocycle,
  type PlannedExercise,
  type PrRecord,
  type Rir,
  type RoutineDay,
  type SetKind,
  type SetLog,
  type Settings,
  type Workout,
  type WorkoutExercise,
} from '../domain/types';
import { db, uid } from './db';

const now = () => Date.now();

async function recordDeletions(table: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const deletedAt = now();
  await db.deletions.bulkPut(ids.map((id) => ({ id, table, deletedAt })));
}

// ───────────────────────── Ajustes ─────────────────────────

export async function getSettings(): Promise<Settings> {
  const rows = await db.settings.toArray();
  const stored: Record<string, unknown> = {};
  for (const r of rows) stored[r.key] = r.value;
  return { ...DEFAULT_SETTINGS, ...(stored as Partial<Settings>) };
}

export async function saveSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
  await db.settings.put({ key, value });
}

// ───────────────────────── Ejercicios ─────────────────────────

export interface CustomExerciseInput {
  nameEs: string;
  nameEn?: string;
  group: GroupId;
  equipment: EquipmentId;
  primary: MuscleId[];
  secondary: MuscleId[];
  unilateral: boolean;
}

export async function createCustomExercise(input: CustomExerciseInput): Promise<string> {
  const id = uid();
  const exercise: Exercise = {
    id,
    nameEs: input.nameEs.trim(),
    nameEn: (input.nameEn ?? input.nameEs).trim(),
    group: input.group,
    equipment: input.equipment,
    primary: input.primary,
    secondary: input.secondary.filter((m) => !input.primary.includes(m)),
    unilateral: input.unilateral,
    custom: true,
    updatedAt: now(),
  };
  await db.exercises.put(exercise);
  return id;
}

export async function toggleFavorite(exerciseId: string): Promise<boolean> {
  const existing = await db.favorites.get(exerciseId);
  if (existing) {
    await db.favorites.delete(exerciseId);
    return false;
  }
  await db.favorites.put({ exerciseId, updatedAt: now() });
  return true;
}

// ───────────────────────── Mesociclos ─────────────────────────

export interface MesocycleInput {
  name: string;
  microcycles: number;
  /** Última semana de descarga. */
  deload: boolean;
  dayNames: string[];
}

async function archiveActive(): Promise<void> {
  const active = await db.mesocycles.where('status').equals('active').toArray();
  for (const m of active) {
    await db.mesocycles.update(m.id, { status: 'archived', finishedAt: now(), updatedAt: now() });
  }
}

/** Crea un mesociclo y lo deja como único activo (el anterior pasa al historial). */
export async function createMesocycle(input: MesocycleInput): Promise<string> {
  const id = uid();
  const microcycles = Math.max(1, Math.round(input.microcycles));
  await db.transaction('rw', db.mesocycles, db.days, async () => {
    await archiveActive();
    const meso: Mesocycle = {
      id,
      name: input.name.trim() || 'Mesociclo',
      microcycles,
      deloadMicro: input.deload ? microcycles : null,
      status: 'active',
      createdAt: now(),
      finishedAt: null,
      updatedAt: now(),
    };
    await db.mesocycles.put(meso);
    const days: RoutineDay[] = input.dayNames.map((name, i) => ({
      id: uid(),
      mesocycleId: id,
      order: i,
      name: name.trim(),
      updatedAt: now(),
    }));
    await db.days.bulkPut(days);
  });
  return id;
}

export async function updateMesocycle(
  id: string,
  patch: Partial<Pick<Mesocycle, 'name' | 'microcycles' | 'deloadMicro'>>,
): Promise<void> {
  await db.mesocycles.update(id, { ...patch, updatedAt: now() });
}

export async function finishMesocycle(id: string): Promise<void> {
  await db.mesocycles.update(id, { status: 'archived', finishedAt: now(), updatedAt: now() });
}

/** Copia la estructura (días y ejercicios, sin entrenos) como base de un mesociclo nuevo. */
export async function duplicateMesocycle(sourceId: string, name: string): Promise<string> {
  const source = await db.mesocycles.get(sourceId);
  if (!source) throw new Error('Mesociclo no encontrado');
  const days = await db.days.where('mesocycleId').equals(sourceId).sortBy('order');
  const planned = await db.planned.where('mesocycleId').equals(sourceId).toArray();
  const id = uid();
  await db.transaction('rw', db.mesocycles, db.days, db.planned, async () => {
    await archiveActive();
    await db.mesocycles.put({
      ...source,
      id,
      name: name.trim() || source.name,
      status: 'active',
      createdAt: now(),
      finishedAt: null,
      updatedAt: now(),
    });
    for (const day of days) {
      const dayId = uid();
      await db.days.put({ ...day, id: dayId, mesocycleId: id, updatedAt: now() });
      const items = planned.filter((p) => p.dayId === day.id);
      await db.planned.bulkPut(
        items.map((p) => ({
          ...p,
          id: uid(),
          mesocycleId: id,
          dayId,
          // Las sustituciones puntuales eran de aquel mesociclo: se parte del ejercicio base.
          exerciseByMicro: {},
          updatedAt: now(),
        })),
      );
    }
  });
  return id;
}

export async function deleteMesocycle(id: string): Promise<void> {
  await db.transaction(
    'rw',
    [db.mesocycles, db.days, db.planned, db.workouts, db.workoutExercises, db.sets, db.prs, db.deletions],
    async () => {
      const workouts = await db.workouts.where('mesocycleId').equals(id).primaryKeys();
      for (const wid of workouts) await deleteWorkoutRows(wid);
      const dayIds = await db.days.where('mesocycleId').equals(id).primaryKeys();
      const plannedIds = await db.planned.where('mesocycleId').equals(id).primaryKeys();
      await db.days.bulkDelete(dayIds);
      await db.planned.bulkDelete(plannedIds);
      await db.mesocycles.delete(id);
      await recordDeletions('days', dayIds);
      await recordDeletions('planned', plannedIds);
      await recordDeletions('mesocycles', [id]);
    },
  );
}

// ───────────────────────── Días y ejercicios planificados ─────────────────────────

export async function addDay(mesocycleId: string, name: string): Promise<string> {
  const count = await db.days.where('mesocycleId').equals(mesocycleId).count();
  const id = uid();
  await db.days.put({ id, mesocycleId, order: count, name: name.trim(), updatedAt: now() });
  return id;
}

export async function renameDay(id: string, name: string): Promise<void> {
  await db.days.update(id, { name: name.trim(), updatedAt: now() });
}

export async function removeDay(id: string): Promise<void> {
  await db.transaction('rw', db.days, db.planned, db.deletions, async () => {
    const day = await db.days.get(id);
    if (!day) return;
    const plannedIds = await db.planned.where('dayId').equals(id).primaryKeys();
    await db.planned.bulkDelete(plannedIds);
    await db.days.delete(id);
    await recordDeletions('planned', plannedIds);
    await recordDeletions('days', [id]);
    const rest = await db.days.where('mesocycleId').equals(day.mesocycleId).sortBy('order');
    await Promise.all(rest.map((d, i) => db.days.update(d.id, { order: i, updatedAt: now() })));
  });
}

export interface PlannedInput {
  sets: number;
  repMin: number;
  repMax: number;
  targetRir: Rir | null;
  restSec: number;
  notes: string;
}

export const DEFAULT_PLANNED: PlannedInput = {
  sets: 3,
  repMin: 8,
  repMax: 12,
  targetRir: 9,
  restSec: 120,
  notes: '',
};

export async function addPlanned(dayId: string, exerciseId: string, input: PlannedInput = DEFAULT_PLANNED): Promise<string> {
  const day = await db.days.get(dayId);
  if (!day) throw new Error('Día no encontrado');
  const count = await db.planned.where('dayId').equals(dayId).count();
  const id = uid();
  const pe: PlannedExercise = {
    id,
    mesocycleId: day.mesocycleId,
    dayId,
    order: count,
    exerciseId,
    ...input,
    setsByMicro: {},
    rirByMicro: {},
    exerciseByMicro: {},
    updatedAt: now(),
  };
  await db.planned.put(pe);
  return id;
}

export async function updatePlanned(id: string, patch: Partial<PlannedExercise>): Promise<void> {
  await db.planned.update(id, { ...patch, updatedAt: now() });
}

export async function removePlanned(id: string): Promise<void> {
  await db.transaction('rw', db.planned, db.deletions, async () => {
    const pe = await db.planned.get(id);
    if (!pe) return;
    await db.planned.delete(id);
    await recordDeletions('planned', [id]);
    const rest = await db.planned.where('dayId').equals(pe.dayId).sortBy('order');
    await Promise.all(rest.map((p, i) => db.planned.update(p.id, { order: i, updatedAt: now() })));
  });
}

export async function movePlanned(id: string, direction: -1 | 1): Promise<void> {
  await db.transaction('rw', db.planned, async () => {
    const pe = await db.planned.get(id);
    if (!pe) return;
    const list = await db.planned.where('dayId').equals(pe.dayId).sortBy('order');
    const index = list.findIndex((p) => p.id === id);
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    await Promise.all(list.map((p, i) => db.planned.update(p.id, { order: i, updatedAt: now() })));
  });
}

export type SubstituteScope = 'week' | 'rest';

/**
 * Sustituye un ejercicio del plan a partir de un microciclo:
 *  - 'week': solo ese microciclo.
 *  - 'rest': ese microciclo y todos los que quedan.
 */
export async function substitutePlanned(
  plannedId: string,
  newExerciseId: string,
  micro: number,
  scope: SubstituteScope,
): Promise<void> {
  await db.transaction('rw', db.planned, db.mesocycles, async () => {
    const pe = await db.planned.get(plannedId);
    if (!pe) return;
    const meso = await db.mesocycles.get(pe.mesocycleId);
    const last = scope === 'rest' ? (meso?.microcycles ?? micro) : micro;
    const exerciseByMicro = { ...pe.exerciseByMicro };
    for (let m = micro; m <= last; m++) {
      if (newExerciseId === pe.exerciseId) delete exerciseByMicro[m];
      else exerciseByMicro[m] = newExerciseId;
    }
    await db.planned.update(plannedId, { exerciseByMicro, updatedAt: now() });
  });
}

// ───────────────────────── Entrenos ─────────────────────────

export async function getInProgressWorkout(): Promise<Workout | undefined> {
  return db.workouts.where('status').equals('in_progress').first();
}

export interface StartWorkoutOptions {
  /** Fecha pasada para registrar un entreno a posteriori (YYYY-MM-DD). */
  date?: string;
}

/**
 * Empieza el entreno de un día en un microciclo: copia el plan vigente esa
 * semana (series, RIR, sustituciones, descarga) como series vacías a rellenar.
 * Si ya hay uno en curso, devuelve ese.
 */
export async function startWorkout(
  mesocycleId: string,
  dayId: string,
  micro: number,
  options: StartWorkoutOptions = {},
): Promise<string> {
  const current = await getInProgressWorkout();
  if (current) return current.id;
  const meso = await db.mesocycles.get(mesocycleId);
  if (!meso) throw new Error('Mesociclo no encontrado');
  const planned = await db.planned.where('dayId').equals(dayId).sortBy('order');
  const id = uid();
  const backfilled = options.date != null && options.date !== todayIso();
  const workout: Workout = {
    id,
    mesocycleId,
    dayId,
    micro,
    date: options.date ?? todayIso(),
    startedAt: now(),
    finishedAt: null,
    durationSec: 0,
    status: 'in_progress',
    backfilled,
    notes: '',
    updatedAt: now(),
  };
  const exercises: WorkoutExercise[] = [];
  const sets: SetLog[] = [];
  planned.forEach((pe, order) => {
    const plan = effectivePlan(pe, meso, micro);
    const we: WorkoutExercise = {
      id: uid(),
      workoutId: id,
      plannedExerciseId: pe.id,
      exerciseId: plan.exerciseId,
      order,
      repMin: pe.repMin,
      repMax: pe.repMax,
      targetRir: plan.targetRir,
      restSec: pe.restSec,
      notes: '',
      updatedAt: now(),
    };
    exercises.push(we);
    for (let i = 0; i < plan.sets; i++) {
      sets.push(emptySet(id, we.id, plan.exerciseId, i, 'work'));
    }
  });
  await db.transaction('rw', db.workouts, db.workoutExercises, db.sets, async () => {
    await db.workouts.put(workout);
    await db.workoutExercises.bulkPut(exercises);
    await db.sets.bulkPut(sets);
  });
  return id;
}

function emptySet(workoutId: string, workoutExerciseId: string, exerciseId: string, index: number, kind: SetKind): SetLog {
  return {
    id: uid(),
    workoutId,
    workoutExerciseId,
    exerciseId,
    index,
    kind,
    weight: null,
    reps: null,
    rir: null,
    drops: [],
    done: false,
    updatedAt: now(),
  };
}

export async function saveSet(id: string, patch: Partial<Pick<SetLog, 'weight' | 'reps' | 'rir' | 'drops' | 'done'>>): Promise<void> {
  const clean = { ...patch };
  if (clean.drops) clean.drops = clean.drops.slice(0, 3);
  await db.sets.update(id, { ...clean, updatedAt: now() });
}

async function reindexSets(workoutExerciseId: string): Promise<void> {
  const list = await db.sets.where('workoutExerciseId').equals(workoutExerciseId).toArray();
  // Las de aproximación siempre van antes que las efectivas.
  list.sort((a, b) => (a.kind === b.kind ? a.index - b.index : a.kind === 'warmup' ? -1 : 1));
  await Promise.all(list.map((s, i) => (s.index === i ? null : db.sets.update(s.id, { index: i, updatedAt: now() }))));
}

export async function addSet(workoutExerciseId: string, kind: SetKind): Promise<string> {
  return db.transaction('rw', db.sets, db.workoutExercises, async () => {
    const we = await db.workoutExercises.get(workoutExerciseId);
    if (!we) throw new Error('Ejercicio no encontrado');
    const list = await db.sets.where('workoutExerciseId').equals(workoutExerciseId).toArray();
    const set = emptySet(we.workoutId, we.id, we.exerciseId, list.length + 1000, kind);
    await db.sets.put(set);
    await reindexSets(workoutExerciseId);
    return set.id;
  });
}

export async function removeSet(id: string): Promise<void> {
  await db.transaction('rw', db.sets, db.deletions, async () => {
    const set = await db.sets.get(id);
    if (!set) return;
    await db.sets.delete(id);
    await recordDeletions('sets', [id]);
    await reindexSets(set.workoutExerciseId);
  });
}

export async function moveWorkoutExercise(id: string, direction: -1 | 1): Promise<void> {
  await db.transaction('rw', db.workoutExercises, async () => {
    const we = await db.workoutExercises.get(id);
    if (!we) return;
    const list = await db.workoutExercises.where('workoutId').equals(we.workoutId).sortBy('order');
    const index = list.findIndex((w) => w.id === id);
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    await Promise.all(list.map((w, i) => db.workoutExercises.update(w.id, { order: i, updatedAt: now() })));
  });
}

export async function setWorkoutExerciseNotes(id: string, notes: string): Promise<void> {
  await db.workoutExercises.update(id, { notes, updatedAt: now() });
}

/**
 * Cambia el ejercicio en mitad del entreno (máquina ocupada, molestia…) y
 * lo refleja en el plan: solo esta semana o también en las que quedan.
 */
export async function substituteWorkoutExercise(
  workoutExerciseId: string,
  newExerciseId: string,
  scope: SubstituteScope,
): Promise<void> {
  await db.transaction('rw', db.workoutExercises, db.sets, db.workouts, db.planned, db.mesocycles, async () => {
    const we = await db.workoutExercises.get(workoutExerciseId);
    if (!we) return;
    const workout = await db.workouts.get(we.workoutId);
    await db.workoutExercises.update(we.id, { exerciseId: newExerciseId, updatedAt: now() });
    const sets = await db.sets.where('workoutExerciseId').equals(we.id).toArray();
    // Las series ya hechas eran del ejercicio anterior: se vacían para no mezclar marcas.
    await Promise.all(
      sets.map((s) =>
        db.sets.update(s.id, {
          exerciseId: newExerciseId,
          weight: null,
          reps: null,
          rir: null,
          drops: [],
          done: false,
          updatedAt: now(),
        }),
      ),
    );
    if (we.plannedExerciseId && workout) {
      await substitutePlanned(we.plannedExerciseId, newExerciseId, workout.micro, scope);
    }
  });
}

/** Añade al entreno en curso un ejercicio que no estaba en el plan. */
export async function addWorkoutExercise(workoutId: string, exerciseId: string, sets = 3): Promise<string> {
  const count = await db.workoutExercises.where('workoutId').equals(workoutId).count();
  const we: WorkoutExercise = {
    id: uid(),
    workoutId,
    plannedExerciseId: null,
    exerciseId,
    order: count,
    repMin: DEFAULT_PLANNED.repMin,
    repMax: DEFAULT_PLANNED.repMax,
    targetRir: DEFAULT_PLANNED.targetRir,
    restSec: DEFAULT_PLANNED.restSec,
    notes: '',
    updatedAt: now(),
  };
  await db.transaction('rw', db.workoutExercises, db.sets, async () => {
    await db.workoutExercises.put(we);
    await db.sets.bulkPut(Array.from({ length: sets }, (_, i) => emptySet(workoutId, we.id, exerciseId, i, 'work')));
  });
  return we.id;
}

async function deleteWorkoutRows(workoutId: string): Promise<void> {
  const weIds = await db.workoutExercises.where('workoutId').equals(workoutId).primaryKeys();
  const setIds = await db.sets.where('workoutId').equals(workoutId).primaryKeys();
  const prIds = await db.prs.where('workoutId').equals(workoutId).primaryKeys();
  await db.workoutExercises.bulkDelete(weIds);
  await db.sets.bulkDelete(setIds);
  await db.prs.bulkDelete(prIds);
  await db.workouts.delete(workoutId);
  await recordDeletions('workoutExercises', weIds);
  await recordDeletions('sets', setIds);
  await recordDeletions('prs', prIds);
  await recordDeletions('workouts', [workoutId]);
}

export async function discardWorkout(workoutId: string): Promise<void> {
  await db.transaction('rw', db.workouts, db.workoutExercises, db.sets, db.prs, db.deletions, () =>
    deleteWorkoutRows(workoutId),
  );
}

/** Mejor 1RM estimado de un ejercicio en entrenos terminados (sin contar uno dado). */
export async function bestE1rmBefore(exerciseId: string, excludeWorkoutId: string): Promise<number | null> {
  const sets = await db.sets.where('exerciseId').equals(exerciseId).toArray();
  const doneWorkouts = new Set(await db.workouts.where('status').equals('done').primaryKeys());
  let best = 0;
  for (const s of sets) {
    if (s.workoutId === excludeWorkoutId || !doneWorkouts.has(s.workoutId)) continue;
    const v = setE1rm(s);
    if (v > best) best = v;
  }
  return best > 0 ? best : null;
}

/** Series de la última vez que se hizo un ejercicio (mismo día si es posible). */
export async function previousSets(
  exerciseId: string,
  current: Pick<Workout, 'id' | 'dayId'>,
): Promise<{ workout: Workout; sets: SetLog[] } | null> {
  const sets = await db.sets.where('exerciseId').equals(exerciseId).toArray();
  const ids = [...new Set(sets.map((s) => s.workoutId))].filter((id) => id !== current.id);
  if (ids.length === 0) return null;
  const workouts = (await db.workouts.bulkGet(ids)).filter((w): w is Workout => !!w && w.status === 'done');
  if (workouts.length === 0) return null;
  const byRecency = (a: Workout, b: Workout) => (b.date === a.date ? b.startedAt - a.startedAt : b.date.localeCompare(a.date));
  const sameDay = workouts.filter((w) => w.dayId === current.dayId).sort(byRecency);
  const chosen = sameDay[0] ?? workouts.sort(byRecency)[0];
  const list = sets
    .filter((s) => s.workoutId === chosen.id && s.kind === 'work' && s.done)
    .sort((a, b) => a.index - b.index);
  return { workout: chosen, sets: list };
}

export interface FinishResult {
  prs: PrRecord[];
}

/**
 * Cierra el entreno: descarta las series sin hacer, calcula la duración y
 * guarda los récords (mejor 1RM estimado por ejercicio si supera el anterior).
 */
export async function finishWorkout(workoutId: string): Promise<FinishResult> {
  const workout = await db.workouts.get(workoutId);
  if (!workout) throw new Error('Entreno no encontrado');
  const allSets = await db.sets.where('workoutId').equals(workoutId).toArray();
  const pending = allSets.filter((s) => !s.done).map((s) => s.id);
  const done = allSets.filter((s) => s.done);
  const prs: PrRecord[] = [];
  const exerciseIds = [...new Set(done.map((s) => s.exerciseId))];
  for (const exerciseId of exerciseIds) {
    const best = bestSet(done.filter((s) => s.exerciseId === exerciseId));
    if (!best) continue;
    const value = setE1rm(best);
    const previous = await bestE1rmBefore(exerciseId, workoutId);
    if (isNewPr(value, previous)) {
      prs.push({
        id: uid(),
        exerciseId,
        e1rm: value,
        weight: best.weight as number,
        reps: best.reps as number,
        date: workout.date,
        workoutId,
        mesocycleId: workout.mesocycleId,
        micro: workout.micro,
        updatedAt: now(),
      });
    }
  }
  const finishedAt = now();
  await db.transaction('rw', db.workouts, db.sets, db.prs, db.deletions, async () => {
    await db.sets.bulkDelete(pending);
    await recordDeletions('sets', pending);
    await db.prs.bulkPut(prs);
    await db.workouts.update(workoutId, {
      status: 'done',
      finishedAt,
      durationSec: workout.backfilled ? 0 : Math.round((finishedAt - workout.startedAt) / 1000),
      updatedAt: finishedAt,
    });
  });
  return { prs };
}

// ───────────────────────── Progreso del mesociclo ─────────────────────────

/**
 * Microciclo en el que toca entrenar: el último con algún entreno hecho,
 * o el siguiente si ese ya tiene todos sus días completados.
 */
export function currentMicro(meso: Mesocycle, dayIds: string[], doneWorkouts: Pick<Workout, 'dayId' | 'micro'>[]): number {
  if (doneWorkouts.length === 0) return 1;
  const last = Math.max(...doneWorkouts.map((w) => w.micro));
  const doneInLast = new Set(doneWorkouts.filter((w) => w.micro === last).map((w) => w.dayId));
  const complete = dayIds.length > 0 && dayIds.every((id) => doneInLast.has(id));
  return Math.min(meso.microcycles, complete ? last + 1 : last);
}

// ───────────────────────── Peso corporal ─────────────────────────

export async function addBodyWeight(kg: number, date: string = todayIso()): Promise<void> {
  const existing = await db.bodyWeights.where('date').equals(date).first();
  const row: BodyWeight = { id: existing?.id ?? uid(), date, kg, updatedAt: now() };
  await db.bodyWeights.put(row);
}

export async function removeBodyWeight(id: string): Promise<void> {
  await db.bodyWeights.delete(id);
  await recordDeletions('bodyWeights', [id]);
}
