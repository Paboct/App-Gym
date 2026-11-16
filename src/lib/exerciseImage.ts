import { EXERCISE_IMAGE_IDS } from '../data/exerciseImages';

/** Ruta relativa de la foto del ejercicio (la app usa base './'), o null si no tiene. */
export function exerciseImageUrl(id: string): string | null {
  return EXERCISE_IMAGE_IDS.has(id) ? `${import.meta.env?.BASE_URL ?? './'}exercises/${id}.webp` : null;
}
