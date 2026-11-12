/** Músculos concretos que la app distingue (y pinta en el mapa corporal). */
export const MUSCLES = [
  'chest_upper',
  'chest_mid',
  'chest_lower',
  'delt_front',
  'delt_side',
  'delt_rear',
  'traps_upper',
  'traps_mid',
  'upper_back',
  'lats',
  'lower_back',
  'biceps',
  'triceps',
  'forearm',
  'abs',
  'obliques',
  'glute_max',
  'glute_med',
  'quads',
  'hamstrings',
  'adductors',
  'calves',
] as const;

export type MuscleId = (typeof MUSCLES)[number];

export const GROUPS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'core',
  'glutes',
  'quads',
  'hamstrings',
  'adductors',
  'calves',
] as const;

export type GroupId = (typeof GROUPS)[number];

/** Grupo muscular al que pertenece cada músculo concreto. */
export const MUSCLE_GROUP: Record<MuscleId, GroupId> = {
  chest_upper: 'chest',
  chest_mid: 'chest',
  chest_lower: 'chest',
  delt_front: 'shoulders',
  delt_side: 'shoulders',
  delt_rear: 'shoulders',
  traps_upper: 'back',
  traps_mid: 'back',
  upper_back: 'back',
  lats: 'back',
  lower_back: 'back',
  biceps: 'biceps',
  triceps: 'triceps',
  forearm: 'forearms',
  abs: 'core',
  obliques: 'core',
  glute_max: 'glutes',
  glute_med: 'glutes',
  quads: 'quads',
  hamstrings: 'hamstrings',
  adductors: 'adductors',
  calves: 'calves',
};

export const MUSCLE_NAMES: Record<MuscleId, { es: string; en: string }> = {
  chest_upper: { es: 'Pectoral superior', en: 'Upper chest' },
  chest_mid: { es: 'Pectoral medio', en: 'Mid chest' },
  chest_lower: { es: 'Pectoral inferior', en: 'Lower chest' },
  delt_front: { es: 'Deltoides anterior', en: 'Front delt' },
  delt_side: { es: 'Deltoides lateral', en: 'Side delt' },
  delt_rear: { es: 'Deltoides posterior', en: 'Rear delt' },
  traps_upper: { es: 'Trapecio superior', en: 'Upper traps' },
  traps_mid: { es: 'Trapecio medio e inferior', en: 'Mid & lower traps' },
  upper_back: { es: 'Romboides y redondos', en: 'Rhomboids & teres' },
  lats: { es: 'Dorsal ancho', en: 'Lats' },
  lower_back: { es: 'Lumbares', en: 'Lower back' },
  biceps: { es: 'Bíceps', en: 'Biceps' },
  triceps: { es: 'Tríceps', en: 'Triceps' },
  forearm: { es: 'Antebrazo', en: 'Forearm' },
  abs: { es: 'Recto abdominal', en: 'Abs' },
  obliques: { es: 'Oblicuos', en: 'Obliques' },
  glute_max: { es: 'Glúteo mayor', en: 'Glute max' },
  glute_med: { es: 'Glúteo medio', en: 'Glute med' },
  quads: { es: 'Cuádriceps', en: 'Quads' },
  hamstrings: { es: 'Isquiotibiales', en: 'Hamstrings' },
  adductors: { es: 'Aductores', en: 'Adductors' },
  calves: { es: 'Gemelos', en: 'Calves' },
};

export const GROUP_NAMES: Record<GroupId, { es: string; en: string }> = {
  chest: { es: 'Pecho', en: 'Chest' },
  back: { es: 'Espalda', en: 'Back' },
  shoulders: { es: 'Hombros', en: 'Shoulders' },
  biceps: { es: 'Bíceps', en: 'Biceps' },
  triceps: { es: 'Tríceps', en: 'Triceps' },
  forearms: { es: 'Antebrazos', en: 'Forearms' },
  core: { es: 'Core', en: 'Core' },
  glutes: { es: 'Glúteos', en: 'Glutes' },
  quads: { es: 'Cuádriceps', en: 'Quads' },
  hamstrings: { es: 'Isquios', en: 'Hamstrings' },
  adductors: { es: 'Aductores', en: 'Adductors' },
  calves: { es: 'Gemelos', en: 'Calves' },
};

export const EQUIPMENT = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'smith',
  'bodyweight',
  'other',
] as const;

export type EquipmentId = (typeof EQUIPMENT)[number];

export const EQUIPMENT_NAMES: Record<EquipmentId, { es: string; en: string }> = {
  barbell: { es: 'Barra', en: 'Barbell' },
  dumbbell: { es: 'Mancuernas', en: 'Dumbbells' },
  machine: { es: 'Máquina', en: 'Machine' },
  cable: { es: 'Polea', en: 'Cable' },
  smith: { es: 'Multipower', en: 'Smith machine' },
  bodyweight: { es: 'Peso corporal', en: 'Bodyweight' },
  other: { es: 'Otro', en: 'Other' },
};
