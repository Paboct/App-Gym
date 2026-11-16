import { countsForMetrics, kgToUnit, roundForDisplay, setE1rm, setVolume } from './calc';
import type {
  Exercise,
  Mesocycle,
  PlannedExercise,
  RoutineDay,
  SetLog,
  Unit,
  Workout,
  WorkoutExercise,
} from './types';

/** Todo lo que hace falta para armar el Excel de un mesociclo. */
export interface ExportInput {
  meso: Mesocycle;
  days: RoutineDay[];
  planned: PlannedExercise[];
  workouts: Workout[];
  workoutExercises: WorkoutExercise[];
  sets: SetLog[];
  exercises: Map<string, Exercise>;
  unit: Unit;
  lang: 'es' | 'en';
}

export interface RoutineRow {
  day: number;
  dayName: string;
  exercise: string;
  sets: number;
  reps: string;
  rir: number | null;
  restSec: number;
  notes: string;
}

export interface SetRow {
  micro: number;
  day: string;
  date: string;
  exercise: string;
  kind: 'warmup' | 'work';
  setNo: number;
  weight: number | null;
  reps: number | null;
  rir: number | null;
  drops: string;
  volume: number;
}

export interface ProgressRow {
  exerciseId: string;
  exercise: string;
  micro: number;
  maxWeight: number;
  e1rm: number;
  volume: number;
  sets: number;
}

function exerciseLabel(input: ExportInput, id: string): string {
  const ex = input.exercises.get(id);
  if (!ex) return id;
  return input.lang === 'es' ? ex.nameEs : ex.nameEn;
}

/** Peso en la unidad del usuario, redondeado para mostrar. */
function show(input: ExportInput, kg: number): number {
  return roundForDisplay(kgToUnit(kg, input.unit), input.unit);
}

export function buildRoutineRows(input: ExportInput): RoutineRow[] {
  const rows: RoutineRow[] = [];
  for (const day of [...input.days].sort((a, b) => a.order - b.order)) {
    const planned = input.planned.filter((p) => p.dayId === day.id).sort((a, b) => a.order - b.order);
    for (const p of planned) {
      rows.push({
        day: day.order,
        dayName: day.name,
        exercise: exerciseLabel(input, p.exerciseId),
        sets: p.sets,
        reps: `${p.repMin}–${p.repMax}`,
        rir: p.targetRir,
        restSec: p.restSec,
        notes: p.notes,
      });
    }
  }
  return rows;
}

export function buildSetRows(input: ExportInput): SetRow[] {
  const dayById = new Map(input.days.map((d) => [d.id, d]));
  const weById = new Map(input.workoutExercises.map((we) => [we.id, we]));
  const done = input.workouts.filter((w) => w.status === 'done');
  const entries: { sortKey: number[]; row: SetRow }[] = [];

  for (const workout of done) {
    const day = dayById.get(workout.dayId);
    const sets = input.sets.filter((s) => s.workoutId === workout.id && s.done);
    const counters = new Map<string, number>();
    for (const s of [...sets].sort((a, b) => a.index - b.index)) {
      const key = `${s.workoutExerciseId}|${s.kind}`;
      const setNo = (counters.get(key) ?? 0) + 1;
      counters.set(key, setNo);
      const drops = s.drops.map((d) => `${show(input, d.weight)}×${d.reps}`).join(' + ');
      entries.push({
        sortKey: [workout.micro, day?.order ?? 0, weById.get(s.workoutExerciseId)?.order ?? 0, s.index],
        row: {
          micro: workout.micro,
          day: day?.name ?? '',
          date: workout.date,
          exercise: exerciseLabel(input, s.exerciseId),
          kind: s.kind,
          setNo,
          weight: s.weight == null ? null : show(input, s.weight),
          reps: s.reps,
          rir: s.rir,
          drops,
          volume: show(input, setVolume(s)),
        },
      });
    }
  }
  entries.sort((a, b) => {
    for (let i = 0; i < a.sortKey.length; i++) if (a.sortKey[i] !== b.sortKey[i]) return a.sortKey[i] - b.sortKey[i];
    return 0;
  });
  return entries.map((e) => e.row);
}

export function buildProgressRows(input: ExportInput): ProgressRow[] {
  const doneById = new Map(input.workouts.filter((w) => w.status === 'done').map((w) => [w.id, w]));
  const groups = new Map<string, { exerciseId: string; micro: number; sets: SetLog[] }>();
  for (const s of input.sets) {
    const workout = doneById.get(s.workoutId);
    if (!workout || !countsForMetrics(s)) continue;
    const key = `${s.exerciseId}|${workout.micro}`;
    const group = groups.get(key) ?? { exerciseId: s.exerciseId, micro: workout.micro, sets: [] };
    group.sets.push(s);
    groups.set(key, group);
  }
  const rows: ProgressRow[] = [...groups.values()].map((g) => ({
    exerciseId: g.exerciseId,
    exercise: exerciseLabel(input, g.exerciseId),
    micro: g.micro,
    maxWeight: show(input, Math.max(...g.sets.map((s) => s.weight ?? 0))),
    e1rm: Math.round(kgToUnit(Math.max(...g.sets.map(setE1rm)), input.unit) * 10) / 10,
    volume: show(input, g.sets.reduce((acc, s) => acc + setVolume(s), 0)),
    sets: g.sets.length,
  }));
  return rows.sort((a, b) => a.exercise.localeCompare(b.exercise) || a.micro - b.micro);
}

/** Nombre de archivo válido en Windows y Android, de hasta 80 caracteres. */
export function sanitizeFileName(name: string): string {
  const clean = name
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
    .trim();
  return clean || 'mesociclo';
}
