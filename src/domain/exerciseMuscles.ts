import { MUSCLE_GROUP, type GroupId, type MuscleId } from './muscles';
import type { Exercise, MuscleActivation, MuscleRole } from './types';

/** Músculos que cuentan para series y volumen: todos menos los estabilizadores. */
export function countedMuscles(e: Exercise): MuscleActivation[] {
  return e.muscles.filter((m) => m.role !== 'estabilizador');
}

/** Cuánto trabaja un ejercicio a un grupo: la activación máxima de sus músculos (sin estabilizadores); 0 si ninguno. */
export function groupActivation(e: Exercise, g: GroupId): number {
  let best = 0;
  for (const m of countedMuscles(e)) if (MUSCLE_GROUP[m.id] === g && m.activation > best) best = m.activation;
  return best;
}

/** Activación de cada músculo en un conjunto de ejercicios (la máxima), estabilizadores incluidos. */
export function muscleActivations(es: (Exercise | undefined)[]): Partial<Record<MuscleId, number>> {
  const out: Partial<Record<MuscleId, number>> = {};
  for (const e of es) {
    if (!e) continue;
    for (const m of e.muscles) if (m.activation > (out[m.id] ?? 0)) out[m.id] = m.activation;
  }
  return out;
}

export type ActivationBand = 'high' | 'mid' | 'low';

/** Tramo de color: ≥ 0,8 alto (rojo) · ≥ 0,4 medio (naranja) · resto bajo (amarillo suave). */
export function activationBand(a: number): ActivationBand {
  if (a >= 0.8) return 'high';
  if (a >= 0.4) return 'mid';
  return 'low';
}

export interface MuscleRow {
  id: MuscleId;
  role: MuscleRole;
  percent: number;
  /** Tramo de color con la activación sin redondear. */
  band: ActivationBand;
}

/** Músculos de un ejercicio (estabilizadores incluidos) de mayor a menor activación, con el porcentaje redondeado. */
export function muscleRows(e: Exercise): MuscleRow[] {
  return [...e.muscles]
    .sort((a, b) => b.activation - a.activation)
    .map((m) => ({ id: m.id, role: m.role, percent: Math.round(m.activation * 100), band: activationBand(m.activation) }));
}
