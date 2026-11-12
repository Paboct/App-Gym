import type { MuscleLevel } from '../components/BodyMap';
import { MUSCLES, type MuscleId } from '../domain/muscles';
import type { Exercise } from '../domain/types';

/** Nivel de implicación de cada músculo en un conjunto de ejercicios (principal gana a secundario). */
export function muscleLevels(exercises: (Exercise | undefined)[]): Partial<Record<MuscleId, MuscleLevel>> {
  const levels: Partial<Record<MuscleId, MuscleLevel>> = {};
  for (const ex of exercises) {
    if (!ex) continue;
    for (const m of ex.secondary) if (!levels[m]) levels[m] = 'secondary';
    for (const m of ex.primary) levels[m] = 'primary';
  }
  return levels;
}

export function splitLevels(levels: Partial<Record<MuscleId, MuscleLevel>>): { primary: MuscleId[]; secondary: MuscleId[] } {
  const primary: MuscleId[] = [];
  const secondary: MuscleId[] = [];
  // En el orden anatómico del catálogo (de arriba abajo), no en el de inserción.
  for (const id of MUSCLES) {
    const level = levels[id];
    if (level) (level === 'primary' ? primary : secondary).push(id);
  }
  return { primary, secondary };
}
