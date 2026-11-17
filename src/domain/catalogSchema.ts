import type { EquipmentId, GroupId } from './muscles';
import type { MuscleRole } from './types';

export type { MuscleRole };
export type Confidence = 'alta' | 'media' | 'baja';

export interface CatalogMuscle {
  musculo_id: string;
  rol: MuscleRole;
  activacion: number;
}

export interface CatalogExerciseData {
  id: string;
  nombre: string;
  nombre_en: string;
  grupo: GroupId;
  equipamiento: EquipmentId;
  unilateral: boolean;
  patron_movimiento: string;
  patron_movimiento_en: string;
  mecanica: 'Compuesto' | 'Aislamiento' | 'Isométrico';
  musculos: CatalogMuscle[];
  descripcion: string;
  descripcion_en: string;
  confianza: Confidence;
  fuentes: string[];
}

export interface CatalogFile {
  version: string;
  ejercicios: CatalogExerciseData[];
}
