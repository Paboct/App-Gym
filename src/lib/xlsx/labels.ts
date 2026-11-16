export interface ExportLabels {
  sheetRoutine: string;
  sheetSets: string;
  sheetData: string;
  sheetProgress: string;
  mesocycle: string;
  microcycles: string;
  deloadWeek: string;
  none: string;
  colDay: string;
  colExercise: string;
  colSets: string;
  colReps: string;
  colRir: string;
  colRest: string;
  colNotes: string;
  colMicro: string;
  colDate: string;
  colType: string;
  colSetNo: string;
  colWeight: (unit: string) => string;
  colRepsDone: string;
  colDrops: string;
  colVolume: (unit: string) => string;
  colE1rm: (unit: string) => string;
  colMaxWeight: (unit: string) => string;
  colEffectiveSets: string;
  colKey: string;
  typeWarmup: string;
  typeWork: string;
  pickExercise: string;
  chartMaxWeight: string;
  chartVolume: string;
}

const ES: ExportLabels = {
  sheetRoutine: 'Rutina',
  sheetSets: 'Entrenos',
  sheetData: 'Datos',
  sheetProgress: 'Progreso',
  mesocycle: 'Mesociclo',
  microcycles: 'Microciclos',
  deloadWeek: 'Semana de descarga',
  none: 'Ninguna',
  colDay: 'Día',
  colExercise: 'Ejercicio',
  colSets: 'Series',
  colReps: 'Repeticiones',
  colRir: 'RIR objetivo',
  colRest: 'Descanso',
  colNotes: 'Notas',
  colMicro: 'Micro',
  colDate: 'Fecha',
  colType: 'Tipo',
  colSetNo: 'Serie',
  colWeight: (u) => `Peso (${u})`,
  colRepsDone: 'Reps',
  colDrops: 'Dropset',
  colVolume: (u) => `Volumen (${u})`,
  colE1rm: (u) => `1RM estimado (${u})`,
  colMaxWeight: (u) => `Peso máx. (${u})`,
  colEffectiveSets: 'Series efectivas',
  colKey: 'Clave',
  typeWarmup: 'Aproximación',
  typeWork: 'Efectiva',
  pickExercise: 'Ejercicio:',
  chartMaxWeight: 'Peso máximo por microciclo',
  chartVolume: 'Volumen por microciclo',
};

const EN: ExportLabels = {
  sheetRoutine: 'Routine',
  sheetSets: 'Workouts',
  sheetData: 'Data',
  sheetProgress: 'Progress',
  mesocycle: 'Mesocycle',
  microcycles: 'Microcycles',
  deloadWeek: 'Deload week',
  none: 'None',
  colDay: 'Day',
  colExercise: 'Exercise',
  colSets: 'Sets',
  colReps: 'Reps',
  colRir: 'Target RIR',
  colRest: 'Rest',
  colNotes: 'Notes',
  colMicro: 'Micro',
  colDate: 'Date',
  colType: 'Type',
  colSetNo: 'Set',
  colWeight: (u) => `Weight (${u})`,
  colRepsDone: 'Reps',
  colDrops: 'Dropset',
  colVolume: (u) => `Volume (${u})`,
  colE1rm: (u) => `Estimated 1RM (${u})`,
  colMaxWeight: (u) => `Max weight (${u})`,
  colEffectiveSets: 'Working sets',
  colKey: 'Key',
  typeWarmup: 'Warm-up',
  typeWork: 'Working',
  pickExercise: 'Exercise:',
  chartMaxWeight: 'Max weight per microcycle',
  chartVolume: 'Volume per microcycle',
};

export function labels(lang: 'es' | 'en'): ExportLabels {
  return lang === 'es' ? ES : EN;
}
