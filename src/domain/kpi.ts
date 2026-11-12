import { MUSCLE_GROUP, type GroupId, type MuscleId } from './muscles';
import { setE1rm, setVolume } from './calc';
import type { Exercise, Mesocycle, PrRecord, SetLog, Workout } from './types';

/**
 * Cálculos de los KPIs. Todo son funciones puras para poder probarlas.
 *
 * El ranking de cada grupo muscular es una mezcla ponderada, con más peso al
 * progreso propio, como se acordó:
 *   progreso 50 % · fuerza relativa al peso corporal 30 % · volumen 20 %.
 * Si no hay peso corporal, la fuerza no se puede medir y su peso se reparte
 * entre progreso y volumen. Los pesos y los nombres/colores de los rangos son
 * provisionales (pendientes de afinar con Symmetry) y están todos aquí arriba
 * para cambiarlos fácil.
 */

export const WEIGHTS = { progress: 0.5, strength: 0.3, volume: 0.2 } as const;

/** Series efectivas semanales de un grupo para puntuar el volumen al máximo. */
const VOLUME_TARGET_SETS = 16;
/** Mejora de 1RM estimado (×) que da la puntuación máxima de progreso. */
const PROGRESS_FULL_GAIN = 0.1;

/** Cuánto trabaja un ejercicio a un grupo: 1 si es principal, 0,5 si es secundario. */
export function groupWeight(exercise: Exercise, group: GroupId): number {
  if (exercise.primary.some((m) => MUSCLE_GROUP[m] === group)) return 1;
  if (exercise.secondary.some((m) => MUSCLE_GROUP[m] === group)) return 0.5;
  return 0;
}

export interface Tier {
  id: string;
  es: string;
  en: string;
  color: string;
  /** Puntuación mínima (0–100) para alcanzar el rango. */
  min: number;
}

/**
 * Rangos (de menor a mayor). Misma jerarquía de color que Symmetry —gris,
 * bronce, plata, oro, rojo, verde, cian, violeta, azul— pero con tonos y
 * nombres propios, y el máximo es «Legacy». Siguen siendo provisionales en
 * cuanto a qué puntuación hace falta para cada uno.
 */
export const TIERS: Tier[] = [
  { id: 'iron', es: 'Hierro', en: 'Iron', color: '#7f858d', min: 0 },
  { id: 'bronze', es: 'Bronce', en: 'Bronze', color: '#bd7a3a', min: 12 },
  { id: 'silver', es: 'Plata', en: 'Silver', color: '#aeb7c2', min: 25 },
  { id: 'gold', es: 'Oro', en: 'Gold', color: '#e7b73e', min: 38 },
  { id: 'ruby', es: 'Rubí', en: 'Ruby', color: '#e5484d', min: 50 },
  { id: 'emerald', es: 'Esmeralda', en: 'Emerald', color: '#23c483', min: 62 },
  { id: 'diamond', es: 'Diamante', en: 'Diamond', color: '#32cfe0', min: 73 },
  { id: 'amethyst', es: 'Amatista', en: 'Amethyst', color: '#9d6bf2', min: 84 },
  { id: 'legacy', es: 'Legacy', en: 'Legacy', color: '#4f74ff', min: 93 },
];

export const NO_DATA_COLOR = 'var(--muscle-idle)';

export function tierForScore(score: number | null): Tier | null {
  if (score == null) return null;
  let tier = TIERS[0];
  for (const t of TIERS) if (score >= t.min) tier = t;
  return tier;
}

// Fuerza de referencia por grupo: 1RM estimado del mejor ejercicio del grupo
// dividido por el peso corporal que da ~100 puntos. Los grupos sin un ratio con
// sentido (gemelos, antebrazos, core, aductores) no puntúan fuerza.
const STRENGTH_REF: Partial<Record<GroupId, number>> = {
  chest: 1.5,
  back: 1.5,
  shoulders: 1.0,
  biceps: 0.6,
  triceps: 0.7,
  quads: 2.25,
  hamstrings: 2.5,
  glutes: 3.0,
};

const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));

export interface WorkoutSets {
  workout: Workout;
  sets: SetLog[];
}

/** Agrupa las series efectivas por entreno terminado, ordenadas por fecha. */
export function groupByWorkout(workouts: Workout[], sets: SetLog[]): WorkoutSets[] {
  const done = workouts.filter((w) => w.status === 'done');
  const byId = new Map(done.map((w) => [w.id, [] as SetLog[]]));
  for (const s of sets) {
    const bucket = byId.get(s.workoutId);
    if (bucket && s.kind === 'work' && s.done) bucket.push(s);
  }
  return done
    .map((workout) => ({ workout, sets: byId.get(workout.id) ?? [] }))
    .sort((a, b) => (a.workout.date === b.workout.date ? a.workout.startedAt - b.workout.startedAt : a.workout.date.localeCompare(b.workout.date)));
}

export interface SeriesPoint {
  label: string;
  value: number;
  /** Clave para ordenar (fecha o nº de microciclo). */
  key: number;
}

/**
 * Volumen de un ejercicio por microciclo dentro de un mesociclo. Se recortan
 * los microciclos finales sin datos (semanas aún no entrenadas) para que la
 * gráfica no parezca que cae a cero; un hueco en medio sí se mantiene.
 */
export function volumeByMicro(exerciseId: string, meso: Mesocycle, data: WorkoutSets[]): SeriesPoint[] {
  const points: SeriesPoint[] = [];
  for (let micro = 1; micro <= meso.microcycles; micro++) {
    const vol = data
      .filter((d) => d.workout.mesocycleId === meso.id && d.workout.micro === micro)
      .reduce((acc, d) => acc + d.sets.filter((s) => s.exerciseId === exerciseId).reduce((a, s) => a + setVolume(s), 0), 0);
    points.push({ label: `S${micro}`, value: vol, key: micro });
  }
  let lastWithData = -1;
  points.forEach((p, i) => {
    if (p.value > 0) lastWithData = i;
  });
  return points.slice(0, Math.max(1, lastWithData + 1));
}

/** Volumen de un ejercicio sesión a sesión en todo el histórico. */
export function volumeGlobal(exerciseId: string, data: WorkoutSets[]): SeriesPoint[] {
  return data
    .map((d) => ({
      d,
      vol: d.sets.filter((s) => s.exerciseId === exerciseId).reduce((a, s) => a + setVolume(s), 0),
    }))
    .filter((x) => x.vol > 0)
    .map((x, i) => ({ label: x.d.workout.date.slice(5), value: x.vol, key: i }));
}

/** Mejor 1RM estimado de un ejercicio por microciclo (para el progreso). */
function bestE1rmByMicro(exerciseId: string, meso: Mesocycle, data: WorkoutSets[]): Map<number, number> {
  const byMicro = new Map<number, number>();
  for (const d of data) {
    if (d.workout.mesocycleId !== meso.id) continue;
    for (const s of d.sets) {
      if (s.exerciseId !== exerciseId) continue;
      const v = setE1rm(s);
      if (v > (byMicro.get(d.workout.micro) ?? 0)) byMicro.set(d.workout.micro, v);
    }
  }
  return byMicro;
}

export interface GroupScore {
  group: GroupId;
  score: number | null;
  progress: number | null;
  strength: number | null;
  volume: number | null;
  weeklySets: number;
}

export interface ScoreContext {
  data: WorkoutSets[];
  exercises: Map<string, Exercise>;
  bodyWeightKg: number | null;
  /** Mesociclo concreto, o null para el ranking global de todo el histórico. */
  meso: Mesocycle | null;
  /** Nº de semanas del ámbito (microciclos del meso, o semanas con datos en global). */
  weeks: number;
}

function progressScore(ctx: ScoreContext, group: GroupId): number | null {
  const ratios: { ratio: number; w: number }[] = [];
  const exIds = new Set(ctx.data.flatMap((d) => d.sets.map((s) => s.exerciseId)));
  for (const exId of exIds) {
    const ex = ctx.exercises.get(exId);
    if (!ex) continue;
    const w = groupWeight(ex, group);
    if (w === 0) continue;
    let first = 0;
    let last = 0;
    if (ctx.meso) {
      const byMicro = bestE1rmByMicro(exId, ctx.meso, ctx.data);
      const micros = [...byMicro.keys()].sort((a, b) => a - b);
      if (micros.length >= 2) {
        first = byMicro.get(micros[0]) ?? 0;
        last = byMicro.get(micros[micros.length - 1]) ?? 0;
      }
    } else {
      // Global: primera y última mejor marca a lo largo del tiempo.
      const vals: number[] = [];
      for (const d of ctx.data) {
        const best = Math.max(0, ...d.sets.filter((s) => s.exerciseId === exId).map(setE1rm));
        if (best > 0) vals.push(best);
      }
      if (vals.length >= 2) {
        first = vals[0];
        last = Math.max(...vals.slice(Math.floor(vals.length / 2)));
      }
    }
    if (first > 0 && last > 0) ratios.push({ ratio: last / first, w });
  }
  if (ratios.length === 0) return null;
  const totalW = ratios.reduce((a, r) => a + r.w, 0);
  const avgRatio = ratios.reduce((a, r) => a + r.ratio * r.w, 0) / totalW;
  // 1,0 → 50 puntos; +PROGRESS_FULL_GAIN → 100; -PROGRESS_FULL_GAIN → 0.
  return clamp(50 + ((avgRatio - 1) / PROGRESS_FULL_GAIN) * 50);
}

function strengthScore(ctx: ScoreContext, group: GroupId): number | null {
  const ref = STRENGTH_REF[group];
  if (!ref || !ctx.bodyWeightKg) return null;
  let best = 0;
  for (const d of ctx.data) {
    for (const s of d.sets) {
      const ex = ctx.exercises.get(s.exerciseId);
      if (!ex || groupWeight(ex, group) < 1) continue; // solo ejercicios principales del grupo
      best = Math.max(best, setE1rm(s));
    }
  }
  if (best === 0) return null;
  return clamp((best / ctx.bodyWeightKg / ref) * 100);
}

/** Series efectivas semanales ponderadas del grupo, y su puntuación de volumen. */
function volumeInfo(ctx: ScoreContext, group: GroupId): { weeklySets: number; score: number | null } {
  let weighted = 0;
  for (const d of ctx.data) {
    for (const s of d.sets) {
      const ex = ctx.exercises.get(s.exerciseId);
      if (!ex) continue;
      weighted += groupWeight(ex, group);
    }
  }
  const weeks = Math.max(1, ctx.weeks);
  const weeklySets = weighted / weeks;
  const score = weighted === 0 ? null : clamp((weeklySets / VOLUME_TARGET_SETS) * 100);
  return { weeklySets, score };
}

export function groupScore(ctx: ScoreContext, group: GroupId): GroupScore {
  const progress = progressScore(ctx, group);
  const strength = strengthScore(ctx, group);
  const vol = volumeInfo(ctx, group);
  const parts: { value: number; weight: number }[] = [];
  if (progress != null) parts.push({ value: progress, weight: WEIGHTS.progress });
  if (strength != null) parts.push({ value: strength, weight: WEIGHTS.strength });
  if (vol.score != null) parts.push({ value: vol.score, weight: WEIGHTS.volume });
  const totalW = parts.reduce((a, p) => a + p.weight, 0);
  const score = totalW === 0 ? null : parts.reduce((a, p) => a + p.value * p.weight, 0) / totalW;
  return { group, score, progress, strength, volume: vol.score, weeklySets: vol.weeklySets };
}

/** Color por músculo a partir del rango de su grupo (para pintar el mapa corporal). */
export function muscleColorsFromScores(scores: Map<GroupId, GroupScore>): Partial<Record<MuscleId, string>> {
  const colors: Partial<Record<MuscleId, string>> = {};
  for (const [muscle, group] of Object.entries(MUSCLE_GROUP) as [MuscleId, GroupId][]) {
    const tier = tierForScore(scores.get(group)?.score ?? null);
    colors[muscle] = tier ? tier.color : NO_DATA_COLOR;
  }
  return colors;
}

// ───────────────────────── Récords ─────────────────────────

export interface RecordStats {
  total: number;
  byMesocycle: { mesocycleId: string; count: number }[];
  byMicro: { mesocycleId: string; micro: number; count: number }[];
  recent: PrRecord[];
}

export function recordStats(prs: PrRecord[]): RecordStats {
  const byMeso = new Map<string, number>();
  const byMicro = new Map<string, number>();
  for (const pr of prs) {
    byMeso.set(pr.mesocycleId, (byMeso.get(pr.mesocycleId) ?? 0) + 1);
    const k = `${pr.mesocycleId}|${pr.micro}`;
    byMicro.set(k, (byMicro.get(k) ?? 0) + 1);
  }
  return {
    total: prs.length,
    byMesocycle: [...byMeso].map(([mesocycleId, count]) => ({ mesocycleId, count })).sort((a, b) => b.count - a.count),
    byMicro: [...byMicro]
      .map(([k, count]) => {
        const [mesocycleId, micro] = k.split('|');
        return { mesocycleId, micro: Number(micro), count };
      })
      .sort((a, b) => b.count - a.count),
    recent: [...prs].sort((a, b) => (b.date === a.date ? b.updatedAt - a.updatedAt : b.date.localeCompare(a.date))).slice(0, 10),
  };
}

// ───────────────────────── Otros KPIs ─────────────────────────

export function avgDurationSec(workouts: Workout[]): number {
  const timed = workouts.filter((w) => w.status === 'done' && !w.backfilled && w.durationSec > 0);
  if (timed.length === 0) return 0;
  return timed.reduce((a, w) => a + w.durationSec, 0) / timed.length;
}

const WEEK = 7 * 24 * 3600 * 1000;

/**
 * Lunes (en ms UTC) de la semana ISO de una fecha YYYY-MM-DD. Se usa UTC a
 * propósito para que el cambio de hora no altere la diferencia entre semanas.
 */
function weekStart(dateIso: string): number {
  const [y, m, d] = dateIso.split('-').map(Number);
  const utc = Date.UTC(y, m - 1, d);
  const day = (new Date(utc).getUTCDay() + 6) % 7; // 0 = lunes
  return utc - day * 24 * 3600 * 1000;
}

/** Semanas seguidas (hasta la más reciente con datos) con al menos un entreno. */
export function weekStreak(workouts: Workout[]): number {
  const weeks = new Set(workouts.filter((w) => w.status === 'done').map((w) => weekStart(w.date)));
  if (weeks.size === 0) return 0;
  const sorted = [...weeks].sort((a, b) => b - a);
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (Math.round((sorted[i - 1] - sorted[i]) / WEEK) === 1) streak++;
    else break;
  }
  return streak;
}

export function weeklySetsByGroup(ctx: ScoreContext): Map<GroupId, number> {
  const out = new Map<GroupId, number>();
  for (const group of Object.values(MUSCLE_GROUP)) if (!out.has(group)) out.set(group, 0);
  const weeks = Math.max(1, ctx.weeks);
  for (const d of ctx.data) {
    for (const s of d.sets) {
      const ex = ctx.exercises.get(s.exerciseId);
      if (!ex) continue;
      for (const group of out.keys()) {
        const w = groupWeight(ex, group);
        if (w > 0) out.set(group, (out.get(group) ?? 0) + w);
      }
    }
  }
  for (const [g, v] of out) out.set(g, v / weeks);
  return out;
}
