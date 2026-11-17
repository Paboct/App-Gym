import { MUSCLES, type MuscleId } from './muscles';
import type { MuscleActivation } from './types';

/**
 * Ids de los 22 músculos de la v1 → músculos actuales (35). Sirve para convertir
 * ejercicios propios guardados antes del cambio (en el móvil o en la nube).
 */
export const LEGACY_MUSCLE_MAP: Record<string, MuscleId[]> = {
  chest_upper: ['pectoral_clavicular'],
  chest_mid: ['pectoral_esternal'],
  chest_lower: ['pectoral_abdominal'],
  delt_front: ['deltoides_anterior'],
  delt_side: ['deltoides_lateral'],
  delt_rear: ['deltoides_posterior'],
  traps_upper: ['trapecio_superior'],
  traps_mid: ['trapecio_medio', 'trapecio_inferior'],
  upper_back: ['romboides', 'redondo_mayor'],
  lats: ['dorsal_ancho'],
  lower_back: ['erectores_espinales'],
  biceps: ['biceps_braquial'],
  triceps: ['triceps_larga', 'triceps_lateral', 'triceps_medial'],
  forearm: ['flexores_antebrazo', 'extensores_antebrazo'],
  abs: ['recto_abdominal'],
  obliques: ['oblicuos'],
  glute_max: ['gluteo_mayor'],
  glute_med: ['gluteo_medio'],
  quads: ['cuadriceps_vastos', 'recto_femoral'],
  hamstrings: ['isquiotibiales'],
  adductors: ['aductores'],
  calves: ['gastrocnemio', 'soleo'],
};

const KNOWN = new Set<string>(MUSCLES);

/** Destinos de un id antiguo; un id que ya es de los 35 se deja tal cual; los desconocidos se ignoran. */
function targets(old: string): MuscleId[] {
  return LEGACY_MUSCLE_MAP[old] ?? (KNOWN.has(old) ? [old as MuscleId] : []);
}

/**
 * Convierte las listas antiguas de principales/secundarios: principal = 1,0 y
 * secundario = 0,5 (igual que un ejercicio propio nuevo). Si un músculo sale en
 * las dos listas, gana el principal; no se repite ningún músculo.
 */
export function convertLegacyMuscles(primary: string[], secondary: string[]): MuscleActivation[] {
  const out: MuscleActivation[] = [];
  const seen = new Set<MuscleId>();
  const add = (ids: string[], role: 'principal' | 'secundario', activation: number) => {
    for (const old of ids) {
      for (const id of targets(old)) {
        if (seen.has(id)) continue;
        seen.add(id);
        out.push({ id, role, activation });
      }
    }
  };
  add(primary ?? [], 'principal', 1);
  add(secondary ?? [], 'secundario', 0.5);
  return out;
}
