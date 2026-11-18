import { countsForMetrics } from './calc';
import { bestE1rmByMicro, groupScore, volumeByMicro, type ScoreContext, type SeriesPoint, type WorkoutSets } from './kpi';
import { GROUPS, type GroupId } from './muscles';
import type { Exercise, Mesocycle, PrRecord } from './types';

/**
 * Comparación de dos mesociclos. Funciones puras (como `kpi.ts`) para poder
 * probarlas sin Dexie ni React.
 */

export interface CompareInput {
  /** Resultado de `groupByWorkout` con TODOS los entrenos. */
  data: WorkoutSets[];
  exercises: Map<string, Exercise>;
  prs: PrRecord[];
  bodyWeightKg: number | null;
}

export interface MesoComparison {
  records: { a: number; b: number };
  groups: { group: GroupId; a: number | null; b: number | null }[];
  common: { exerciseId: string; a: number; b: number; changePct: number }[];
}

function scopedData(meso: Mesocycle, data: WorkoutSets[]): WorkoutSets[] {
  return data.filter((d) => d.workout.mesocycleId === meso.id);
}

function groupScores(meso: Mesocycle, input: CompareInput): Map<GroupId, number | null> {
  const scoped = scopedData(meso, input.data);
  const weeks = new Set(scoped.map((d) => d.workout.micro)).size || 1;
  const ctx: ScoreContext = { data: scoped, exercises: input.exercises, bodyWeightKg: input.bodyWeightKg, meso, weeks };
  return new Map(GROUPS.map((g) => [g, groupScore(ctx, g).score]));
}

/** Mejor 1RM estimado de cada ejercicio en el mesociclo (solo los que tienen 1RM > 0). */
function bestE1rmByExercise(meso: Mesocycle, data: WorkoutSets[]): Map<string, number> {
  const scoped = scopedData(meso, data);
  const ids = new Set(scoped.flatMap((d) => d.sets.map((s) => s.exerciseId)));
  const out = new Map<string, number>();
  for (const id of ids) {
    const best = Math.max(0, ...bestE1rmByMicro(id, meso, scoped).values());
    if (best > 0) out.set(id, best);
  }
  return out;
}

export function compareMesocycles(a: Mesocycle, b: Mesocycle, input: CompareInput): MesoComparison {
  const countPrs = (m: Mesocycle) => input.prs.filter((p) => p.mesocycleId === m.id).length;
  const sa = groupScores(a, input);
  const sb = groupScores(b, input);
  const groups = GROUPS.map((group) => ({ group, a: sa.get(group) ?? null, b: sb.get(group) ?? null })).filter(
    (g) => g.a != null || g.b != null,
  );

  const ea = bestE1rmByExercise(a, input.data);
  const eb = bestE1rmByExercise(b, input.data);
  const common = [...ea]
    .filter(([id]) => eb.has(id))
    .map(([exerciseId, va]) => {
      const vb = eb.get(exerciseId) as number;
      return { exerciseId, a: va, b: vb, changePct: ((vb - va) / va) * 100 };
    })
    .sort((x, y) => Math.abs(y.changePct) - Math.abs(x.changePct));

  return { records: { a: countPrs(a), b: countPrs(b) }, groups, common };
}

/** Mesociclos con al menos un entreno hecho, del más reciente al más antiguo. */
export function mesosWithData(mesos: Mesocycle[], data: WorkoutSets[]): Mesocycle[] {
  const withData = new Set(data.map((d) => d.workout.mesocycleId));
  return mesos.filter((m) => withData.has(m.id)).sort((x, y) => y.createdAt - x.createdAt);
}

/** Pareja por defecto: B = mesociclo más reciente con entrenos hechos, A = el anterior. */
export function pickDefaultPair(mesos: Mesocycle[], data: WorkoutSets[]): { a: Mesocycle; b: Mesocycle } | null {
  const sorted = mesosWithData(mesos, data);
  return sorted.length < 2 ? null : { a: sorted[1], b: sorted[0] };
}

/** Evolución de un ejercicio por microciclo, por 1RM estimado o por volumen. */
export function microSeries(exerciseId: string, meso: Mesocycle, data: WorkoutSets[], metric: 'e1rm' | 'volume'): SeriesPoint[] {
  if (metric === 'volume') return volumeByMicro(exerciseId, meso, data);
  const byMicro = bestE1rmByMicro(exerciseId, meso, data);
  const points: SeriesPoint[] = [];
  for (let micro = 1; micro <= meso.microcycles; micro++) {
    points.push({ label: `S${micro}`, value: byMicro.get(micro) ?? 0, key: micro });
  }
  let last = -1;
  points.forEach((p, i) => {
    if (p.value > 0) last = i;
  });
  return points.slice(0, Math.max(1, last + 1));
}

export interface SetPoint {
  n: number;
  weight: number;
  reps: number;
}

/**
 * Series válidas de un ejercicio en un microciclo, numeradas seguidas por
 * orden cronológico (varios días de la misma semana se encadenan). Dentro de
 * cada entreno van por `index`.
 */
export function microSets(exerciseId: string, mesocycleId: string, micro: number, data: WorkoutSets[]): SetPoint[] {
  const out: SetPoint[] = [];
  for (const d of data) {
    if (d.workout.mesocycleId !== mesocycleId || d.workout.micro !== micro) continue;
    const valid = d.sets.filter((s) => s.exerciseId === exerciseId && countsForMetrics(s)).sort((x, y) => x.index - y.index);
    for (const s of valid) out.push({ n: out.length + 1, weight: s.weight as number, reps: s.reps as number });
  }
  return out;
}

/** Por ejercicio, los microciclos (ordenados) con series válidas; solo los que tienen al menos 2. */
export function exercisesWithTwoMicros(mesocycleId: string, data: WorkoutSets[]): Map<string, number[]> {
  const byEx = new Map<string, Set<number>>();
  for (const d of data) {
    if (d.workout.mesocycleId !== mesocycleId) continue;
    for (const s of d.sets) {
      if (!countsForMetrics(s)) continue;
      if (!byEx.has(s.exerciseId)) byEx.set(s.exerciseId, new Set());
      byEx.get(s.exerciseId)?.add(d.workout.micro);
    }
  }
  const out = new Map<string, number[]>();
  for (const [id, micros] of byEx) if (micros.size >= 2) out.set(id, [...micros].sort((a, b) => a - b));
  return out;
}
