import type { EquipmentId, GroupId, MuscleId } from './muscles';

/**
 * Modelo de datos. Todas las entidades llevan `id` (UUID) y `updatedAt` (ms)
 * para poder sincronizarlas con la nube (Supabase) sin cambiar el esquema.
 * Los pesos se guardan siempre en kg; la conversión a libras es solo de pantalla.
 */

export interface Exercise {
  id: string;
  nameEs: string;
  nameEn: string;
  group: GroupId;
  equipment: EquipmentId;
  primary: MuscleId[];
  secondary: MuscleId[];
  /** Se ejecuta lado a lado: en pantalla se etiqueta "por lado". */
  unilateral: boolean;
  /** Ejercicio creado por el usuario (no viene del catálogo). */
  custom: boolean;
  updatedAt: number;
}

export type MesocycleStatus = 'active' | 'archived';

export interface Mesocycle {
  id: string;
  name: string;
  /** Número de microciclos (semanas). Configurable; por defecto 6. */
  microcycles: number;
  /** Microciclo (1..n) que es semana de descarga, o null si no hay. */
  deloadMicro: number | null;
  status: MesocycleStatus;
  createdAt: number;
  finishedAt: number | null;
  updatedAt: number;
}

export interface RoutineDay {
  id: string;
  mesocycleId: string;
  /** Posición en la secuencia: Día 1, Día 2… (no atado al día de la semana). */
  order: number;
  name: string;
  updatedAt: number;
}

/** RIR en la escala del usuario: 8 = dos en recámara, 9 = una, 10 = al fallo. */
export type Rir = 8 | 9 | 10;

export interface PlannedExercise {
  id: string;
  mesocycleId: string;
  dayId: string;
  order: number;
  exerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
  targetRir: Rir | null;
  restSec: number;
  notes: string;
  /** Variaciones por microciclo (clave = nº de microciclo). */
  setsByMicro: Record<number, number>;
  rirByMicro: Record<number, Rir>;
  /** Sustituciones por microciclo: ejercicio distinto solo en esas semanas. */
  exerciseByMicro: Record<number, string>;
  updatedAt: number;
}

export type WorkoutStatus = 'in_progress' | 'done';

export interface Workout {
  id: string;
  mesocycleId: string;
  dayId: string;
  micro: number;
  /** Fecha del entreno (YYYY-MM-DD). Puede ser pasada si se registra a posteriori. */
  date: string;
  startedAt: number;
  finishedAt: number | null;
  durationSec: number;
  status: WorkoutStatus;
  /** Registrado a posteriori: no tiene duración real. */
  backfilled: boolean;
  notes: string;
  updatedAt: number;
}

export interface WorkoutExercise {
  id: string;
  workoutId: string;
  plannedExerciseId: string | null;
  exerciseId: string;
  order: number;
  repMin: number;
  repMax: number;
  targetRir: Rir | null;
  restSec: number;
  notes: string;
  updatedAt: number;
}

export interface DropSet {
  weight: number;
  reps: number;
}

export type SetKind = 'warmup' | 'work';

export interface SetLog {
  id: string;
  workoutId: string;
  workoutExerciseId: string;
  exerciseId: string;
  /** Orden dentro del ejercicio (las de aproximación van primero). */
  index: number;
  kind: SetKind;
  weight: number | null;
  reps: number | null;
  rir: Rir | null;
  /** Bajadas del dropset (máx. 3). No cuentan para volumen ni PR. */
  drops: DropSet[];
  done: boolean;
  updatedAt: number;
}

/** Récord de 1RM estimado. Queda ligado al microciclo donde se consiguió. */
export interface PrRecord {
  id: string;
  exerciseId: string;
  e1rm: number;
  weight: number;
  reps: number;
  date: string;
  workoutId: string;
  mesocycleId: string;
  micro: number;
  updatedAt: number;
}

export interface BodyWeight {
  id: string;
  date: string;
  kg: number;
  updatedAt: number;
}

export interface Favorite {
  exerciseId: string;
  updatedAt: number;
}

export type Lang = 'es' | 'en';
export type ThemeMode = 'system' | 'dark' | 'light';
export type Unit = 'kg' | 'lb';
export type Figure = 'male' | 'female';

export interface Settings {
  lang: Lang;
  theme: ThemeMode;
  unit: Unit;
  figure: Figure;
}

export const DEFAULT_SETTINGS: Settings = {
  lang: 'es',
  theme: 'dark',
  unit: 'kg',
  figure: 'male',
};

/** Borrados pendientes de propagar a la nube cuando haya sincronización. */
export interface Deletion {
  id: string;
  table: string;
  deletedAt: number;
}
