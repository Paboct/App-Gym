import { sanitizeFileName, type ExportInput } from '../domain/exportRows';
import type { Unit } from '../domain/types';
import { saveAndShare } from '../lib/shareFile';
import { db } from './db';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function exportFileName(mesoName: string): string {
  return `${sanitizeFileName(mesoName)}.xlsx`;
}

/** Lee de la base local todo lo que necesita el Excel de un mesociclo; solo entrenos terminados. */
export async function loadExportInput(mesocycleId: string, unit: Unit, lang: 'es' | 'en'): Promise<ExportInput | null> {
  const meso = await db.mesocycles.get(mesocycleId);
  if (!meso) return null;
  const [days, planned, allWorkouts, exercises] = await Promise.all([
    db.days.where('mesocycleId').equals(mesocycleId).sortBy('order'),
    db.planned.where('mesocycleId').equals(mesocycleId).toArray(),
    db.workouts.where('mesocycleId').equals(mesocycleId).toArray(),
    db.exercises.toArray(),
  ]);
  const workouts = allWorkouts.filter((w) => w.status === 'done');
  const perWorkout = await Promise.all(
    workouts.map(async (w) => ({
      workoutExercises: await db.workoutExercises.where('workoutId').equals(w.id).toArray(),
      sets: await db.sets.where('workoutId').equals(w.id).toArray(),
    })),
  );
  return {
    meso,
    days,
    planned,
    workouts,
    workoutExercises: perWorkout.flatMap((p) => p.workoutExercises),
    sets: perWorkout.flatMap((p) => p.sets),
    exercises: new Map(exercises.map((e) => [e.id, e])),
    unit,
    lang,
  };
}

/** Genera el Excel del mesociclo y lo entrega al usuario. Devuelve false si el mesociclo no existe. */
export async function exportMesocycle(mesocycleId: string, unit: Unit, lang: 'es' | 'en'): Promise<boolean> {
  const input = await loadExportInput(mesocycleId, unit, lang);
  if (!input) return false;
  // Carga perezosa: exceljs es grande y solo hace falta al exportar.
  const { buildWorkbook } = await import('../lib/xlsx/buildWorkbook');
  const bytes = await buildWorkbook(input);
  await saveAndShare(bytes, exportFileName(input.meso.name), XLSX_MIME);
  return true;
}
