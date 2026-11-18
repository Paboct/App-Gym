import JSZip from 'jszip';
import { describe, expect, it, vi } from 'vitest';
import type { ExportInput } from '../src/domain/exportRows';
import type { Exercise, SetLog } from '../src/domain/types';

vi.mock('../src/lib/xlsx/addCharts', async (importOriginal) => {
  const real = await importOriginal<typeof import('../src/lib/xlsx/addCharts')>();
  return { ...real, addCharts: vi.fn(real.addCharts) };
});

import { addCharts } from '../src/lib/xlsx/addCharts';
import { buildWorkbook } from '../src/lib/xlsx/buildWorkbook';

const bench: Exercise = {
  id: 'bench', nameEs: 'Press de banca', nameEn: 'Bench press', group: 'chest', equipment: 'barbell',
  muscles: [{ id: 'pectoral_esternal', role: 'principal', activation: 1 }], unilateral: false, custom: false, updatedAt: 0,
};
const aSet: SetLog = {
  id: 's1', workoutId: 'w1', workoutExerciseId: 'we1', exerciseId: 'bench', index: 1,
  kind: 'work', weight: 80, reps: 8, rir: 9, drops: [], done: true, updatedAt: 0,
};

function input(done: boolean): ExportInput {
  return {
    meso: { id: 'm1', name: 'Meso 1', microcycles: 6, deloadMicro: null, status: 'active', createdAt: 0, finishedAt: null, updatedAt: 0 },
    days: [{ id: 'd1', mesocycleId: 'm1', order: 1, name: 'Pecho', updatedAt: 0 }],
    planned: [],
    workouts: done
      ? [{ id: 'w1', mesocycleId: 'm1', dayId: 'd1', micro: 1, date: '2026-11-02', startedAt: 0, finishedAt: 1, durationSec: 1, status: 'done', backfilled: false, notes: '', updatedAt: 0 }]
      : [],
    workoutExercises: done
      ? [{ id: 'we1', workoutId: 'w1', plannedExerciseId: null, exerciseId: 'bench', order: 1, repMin: 6, repMax: 8, targetRir: 9, restSec: 150, notes: '', updatedAt: 0 }]
      : [],
    sets: done ? [aSet] : [],
    exercises: new Map([['bench', bench]]),
    unit: 'kg',
    lang: 'es',
  };
}

describe('buildWorkbook con gráficas', () => {
  it('incluye dos gráficas cuando hay entrenos', async () => {
    const zip = await JSZip.loadAsync(await buildWorkbook(input(true)));
    expect(Object.keys(zip.files)).toEqual(expect.arrayContaining(['xl/charts/chart1.xml', 'xl/charts/chart2.xml']));
    const chart = await zip.file('xl/charts/chart1.xml')!.async('string');
    expect(chart).toContain("'Progreso'!$B$5:$B$10");
  });

  it('sin entrenos no añade gráficas', async () => {
    const zip = await JSZip.loadAsync(await buildWorkbook(input(false)));
    expect(Object.keys(zip.files).some((n) => n.startsWith('xl/charts/'))).toBe(false);
  });

  it('si añadir las gráficas falla, entrega el libro sin ellas', async () => {
    vi.mocked(addCharts).mockRejectedValueOnce(new Error('boom'));
    const bytes = await buildWorkbook(input(true));
    const zip = await JSZip.loadAsync(bytes);
    expect(zip.file('xl/workbook.xml')).toBeTruthy();
    expect(Object.keys(zip.files).some((n) => n.startsWith('xl/charts/'))).toBe(false);
  });
});
