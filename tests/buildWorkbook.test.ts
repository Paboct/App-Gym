import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import type { ExportInput } from '../src/domain/exportRows';
import type { Exercise, SetLog } from '../src/domain/types';
import { buildWorkbook } from '../src/lib/xlsx/buildWorkbook';
import { labels } from '../src/lib/xlsx/labels';

const ex = (id: string, nameEs: string): Exercise => ({
  id, nameEs, nameEn: nameEs, group: 'chest', equipment: 'barbell', muscles: [{ id: 'pectoral_esternal', role: 'principal', activation: 1 }],
  unilateral: false, custom: false, updatedAt: 0,
});
type SetBase = Pick<SetLog, 'id' | 'workoutId' | 'workoutExerciseId' | 'exerciseId' | 'index'>;
const set = (p: Partial<SetLog> & SetBase): SetLog => ({
  kind: 'work', weight: 80, reps: 8, rir: 9, drops: [], done: true, updatedAt: 0, ...p,
});

function input(withWorkouts = true): ExportInput {
  return {
    meso: { id: 'm1', name: 'Meso 1', microcycles: 6, deloadMicro: 6, status: 'active', createdAt: 0, finishedAt: null, updatedAt: 0 },
    days: [{ id: 'd1', mesocycleId: 'm1', order: 1, name: 'Pecho', updatedAt: 0 }],
    planned: [
      {
        id: 'p1', mesocycleId: 'm1', dayId: 'd1', order: 1, exerciseId: 'bench', sets: 4, repMin: 6, repMax: 8,
        targetRir: 9, restSec: 150, notes: 'pausa', setsByMicro: {}, rirByMicro: {}, exerciseByMicro: {}, updatedAt: 0,
      },
    ],
    workouts: withWorkouts
      ? [
          { id: 'w1', mesocycleId: 'm1', dayId: 'd1', micro: 1, date: '2026-11-02', startedAt: 0, finishedAt: 1, durationSec: 60, status: 'done', backfilled: false, notes: '', updatedAt: 0 },
          { id: 'w2', mesocycleId: 'm1', dayId: 'd1', micro: 2, date: '2026-11-09', startedAt: 0, finishedAt: 1, durationSec: 60, status: 'done', backfilled: false, notes: '', updatedAt: 0 },
        ]
      : [],
    workoutExercises: withWorkouts
      ? [
          { id: 'we1', workoutId: 'w1', plannedExerciseId: 'p1', exerciseId: 'bench', order: 1, repMin: 6, repMax: 8, targetRir: 9, restSec: 150, notes: '', updatedAt: 0 },
          { id: 'we2', workoutId: 'w2', plannedExerciseId: 'p1', exerciseId: 'bench', order: 1, repMin: 6, repMax: 8, targetRir: 9, restSec: 150, notes: '', updatedAt: 0 },
        ]
      : [],
    sets: withWorkouts
      ? [
          set({ id: 's1', workoutId: 'w1', workoutExerciseId: 'we1', exerciseId: 'bench', index: 1 }),
          set({ id: 's2', workoutId: 'w1', workoutExerciseId: 'we1', exerciseId: 'bench', index: 2, reps: 6, drops: [{ weight: 60, reps: 8 }, { weight: 45, reps: 10 }] }),
          set({ id: 's3', workoutId: 'w2', workoutExerciseId: 'we2', exerciseId: 'bench', index: 1, weight: 82.5 }),
        ]
      : [],
    exercises: new Map([['bench', ex('bench', 'Press de banca')]]),
    unit: 'kg',
    lang: 'es',
  };
}

async function load(data: ExportInput) {
  const bytes = await buildWorkbook(data);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(bytes as unknown as ArrayBuffer);
  return wb;
}

describe('buildWorkbook', () => {
  it('crea las hojas Rutina, Entrenos, Datos y Progreso', async () => {
    const wb = await load(input());
    const l = labels('es');
    expect(wb.worksheets.map((w) => w.name)).toEqual([l.sheetRoutine, l.sheetSets, l.sheetData, l.sheetProgress]);
    expect(wb.worksheets.every((w) => w.name.length <= 31)).toBe(true);
  });

  it('Rutina muestra el nombre, los microciclos y los ejercicios', async () => {
    const ws = (await load(input())).getWorksheet(labels('es').sheetRoutine)!;
    const text = JSON.stringify(ws.getSheetValues());
    expect(text).toContain('Meso 1');
    expect(text).toContain('Press de banca');
    expect(text).toContain('6–8');
  });

  it('Entrenos lleva los encabezados, una fila por serie y el dropset escrito', async () => {
    const ws = (await load(input())).getWorksheet(labels('es').sheetSets)!;
    const l = labels('es');
    expect(ws.getRow(1).values).toEqual(expect.arrayContaining([l.colMicro, l.colExercise, l.colDrops]));
    expect(ws.rowCount).toBe(1 + 3);
    expect(JSON.stringify(ws.getSheetValues())).toContain('60×8 + 45×10');
  });

  it('Progreso tiene desplegable con los ejercicios y fórmulas INDEX/MATCH', async () => {
    const ws = (await load(input())).getWorksheet(labels('es').sheetProgress)!;
    const dv = ws.getCell('B2').dataValidation;
    expect(dv.type).toBe('list');
    const f = ws.getCell('B5').value as { formula: string; result?: unknown };
    expect(f.formula).toContain('INDEX');
    expect(f.formula).toContain('MATCH');
    expect(ws.getCell('B2').value).toBe('Press de banca');
    expect(f.result).toBe(80);
  });

  it('un mesociclo sin entrenos se genera sin errores', async () => {
    const wb = await load(input(false));
    expect(wb.getWorksheet(labels('es').sheetRoutine)).toBeTruthy();
    expect(wb.getWorksheet(labels('es').sheetSets)!.rowCount).toBe(1);
  });

  it('los encabezados salen en inglés con lang en', async () => {
    const wb = await load({ ...input(), lang: 'en' });
    expect(wb.worksheets[0].name).toBe(labels('en').sheetRoutine);
  });
});
