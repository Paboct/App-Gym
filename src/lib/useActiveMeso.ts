import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import { currentMicro } from '../data/repo';
import type { Mesocycle, PlannedExercise, PrRecord, RoutineDay, Workout } from '../domain/types';

export interface ActiveMeso {
  meso: Mesocycle;
  days: RoutineDay[];
  planned: PlannedExercise[];
  workouts: Workout[];
  prs: PrRecord[];
  /** Microciclo en el que toca entrenar. */
  micro: number;
  /** Primer día sin hacer de ese microciclo, si queda alguno. */
  nextDay: RoutineDay | null;
  inProgress: Workout | null;
}

/** Estado del mesociclo activo. `undefined` = cargando, `null` = no hay ninguno. */
export function useActiveMeso(): ActiveMeso | null | undefined {
  return useLiveQuery(async () => {
    const meso = await db.mesocycles.where('status').equals('active').first();
    if (!meso) return null;
    const [days, planned, workouts, prs] = await Promise.all([
      db.days.where('mesocycleId').equals(meso.id).sortBy('order'),
      db.planned.where('mesocycleId').equals(meso.id).toArray(),
      db.workouts.where('mesocycleId').equals(meso.id).toArray(),
      db.prs.where('mesocycleId').equals(meso.id).toArray(),
    ]);
    const done = workouts.filter((w) => w.status === 'done');
    const micro = currentMicro(
      meso,
      days.map((d) => d.id),
      done,
    );
    const doneDays = new Set(done.filter((w) => w.micro === micro).map((w) => w.dayId));
    const nextDay = days.find((d) => !doneDays.has(d.id)) ?? null;
    const inProgress = workouts.find((w) => w.status === 'in_progress') ?? null;
    return { meso, days, planned, workouts, prs, micro, nextDay, inProgress };
  }, []);
}
