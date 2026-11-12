import type { Mesocycle, PlannedExercise, Rir, SetLog, Unit } from './types';

const KG_PER_LB = 0.45359237;

export function kgToUnit(kg: number, unit: Unit): number {
  return unit === 'kg' ? kg : kg / KG_PER_LB;
}

export function unitToKg(value: number, unit: Unit): number {
  return unit === 'kg' ? value : value * KG_PER_LB;
}

/** Redondea para pantalla: kg a 0,25 y lb a 0,5 (evita 39,999). */
export function roundForDisplay(value: number, unit: Unit): number {
  const step = unit === 'kg' ? 0.25 : 0.5;
  return Math.round(value / step) * step;
}

export function formatWeight(kg: number, unit: Unit, lang: 'es' | 'en' = 'es'): string {
  const v = roundForDisplay(kgToUnit(kg, unit), unit);
  return v.toLocaleString(lang === 'es' ? 'es-ES' : 'en-US', { maximumFractionDigits: 2 });
}

/** Para 1RM estimados: un decimal, sin forzar a saltos de disco. */
export function formatE1rm(kg: number, unit: Unit, lang: 'es' | 'en' = 'es'): string {
  return kgToUnit(kg, unit).toLocaleString(lang === 'es' ? 'es-ES' : 'en-US', { maximumFractionDigits: 1 });
}

/**
 * 1RM estimado con la fórmula de Epley: peso × (1 + reps / 30).
 * Con 1 repetición el 1RM es el propio peso. Sin peso (ejercicio a peso
 * corporal sin lastre) no hay 1RM calculable y devuelve 0.
 */
export function e1rm(weight: number, reps: number): number {
  if (!(weight > 0) || !(reps > 0)) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/** Una serie cuenta para métricas si es efectiva, está hecha y tiene datos. */
export function countsForMetrics(set: SetLog): boolean {
  return set.kind === 'work' && set.done && set.reps != null && set.reps > 0 && set.weight != null;
}

/**
 * Volumen = peso × repeticiones de las series efectivas.
 * No cuentan ni las de aproximación ni las bajadas de los dropsets.
 */
export function setVolume(set: SetLog): number {
  if (!countsForMetrics(set)) return 0;
  return (set.weight as number) * (set.reps as number);
}

export function totalVolume(sets: SetLog[]): number {
  return sets.reduce((acc, s) => acc + setVolume(s), 0);
}

export function setE1rm(set: SetLog): number {
  if (!countsForMetrics(set)) return 0;
  return e1rm(set.weight as number, set.reps as number);
}

/** Mejor serie (por 1RM estimado) de un conjunto de series, o null. */
export function bestSet(sets: SetLog[]): SetLog | null {
  let best: SetLog | null = null;
  let bestValue = 0;
  for (const s of sets) {
    const v = setE1rm(s);
    if (v > bestValue) {
      best = s;
      bestValue = v;
    }
  }
  return best;
}

/**
 * ¿Es récord? Solo si mejora un récord anterior: la primera vez que se
 * registra un ejercicio fija la marca de partida, sin trofeo.
 */
export function isNewPr(candidateE1rm: number, previousBest: number | null): boolean {
  if (previousBest == null || previousBest <= 0) return false;
  // Margen mínimo para que el redondeo no dispare récords falsos.
  return candidateE1rm > previousBest + 0.01;
}

export function isDeload(meso: Pick<Mesocycle, 'deloadMicro'>, micro: number): boolean {
  return meso.deloadMicro === micro;
}

export interface EffectivePlan {
  exerciseId: string;
  sets: number;
  targetRir: Rir | null;
  /** El ejercicio de esta semana no es el habitual del plan. */
  substituted: boolean;
}

/**
 * Lo que toca hacer de un ejercicio planificado en un microciclo concreto:
 * aplica las variaciones de series y RIR, las sustituciones y, si no hay
 * variación explícita, la semana de descarga (mitad de series, RIR 8).
 */
export function effectivePlan(
  pe: Pick<PlannedExercise, 'exerciseId' | 'sets' | 'targetRir' | 'setsByMicro' | 'rirByMicro' | 'exerciseByMicro'>,
  meso: Pick<Mesocycle, 'deloadMicro'>,
  micro: number,
): EffectivePlan {
  const deload = isDeload(meso, micro);
  const sets = pe.setsByMicro[micro] ?? (deload ? Math.max(1, Math.ceil(pe.sets / 2)) : pe.sets);
  const targetRir = pe.rirByMicro[micro] ?? (deload && pe.targetRir != null ? 8 : pe.targetRir);
  const exerciseId = pe.exerciseByMicro[micro] ?? pe.exerciseId;
  return { exerciseId, sets, targetRir, substituted: exerciseId !== pe.exerciseId };
}

export interface Suggestion {
  weight: number;
  repMin: number;
  repMax: number;
  kind: 'increase' | 'hold';
}

/**
 * Sugerencia de doble progresión a partir de la misma serie de la semana
 * anterior: si llegaste al tope del rango, sube peso y vuelve al mínimo;
 * si no, mismo peso buscando una repetición más.
 */
export function suggestNext(
  last: { weight: number | null; reps: number | null } | null,
  repMin: number,
  repMax: number,
  step = 2.5,
): Suggestion | null {
  if (!last || last.weight == null || last.reps == null || last.reps <= 0) return null;
  if (last.reps >= repMax) {
    const weight = last.weight > 0 ? last.weight + step : last.weight;
    return { weight, repMin, repMax, kind: last.weight > 0 ? 'increase' : 'hold' };
  }
  const target = Math.min(repMax, Math.max(repMin, last.reps + 1));
  return { weight: last.weight, repMin: target, repMax, kind: 'hold' };
}

export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function rirLabel(rir: Rir): { es: string; en: string } {
  if (rir === 10) return { es: 'al fallo', en: 'to failure' };
  if (rir === 9) return { es: '1 en recámara', en: '1 in reserve' };
  return { es: '2 en recámara', en: '2 in reserve' };
}
