import { describe, expect, it } from 'vitest';
import {
  activationBand,
  countedMuscles,
  groupActivation,
  muscleActivations,
  muscleRows,
} from '../src/domain/exerciseMuscles';
import type { Exercise, MuscleActivation } from '../src/domain/types';

const ex = (muscles: MuscleActivation[]): Exercise => ({
  id: 'x', nameEs: 'X', nameEn: 'X', group: 'chest', equipment: 'barbell', muscles,
  unilateral: false, custom: false, updatedAt: 0,
});

const press = ex([
  { id: 'pectoral_esternal', role: 'principal', activation: 1 },
  { id: 'pectoral_clavicular', role: 'secundario', activation: 0.8 },
  { id: 'triceps_lateral', role: 'secundario', activation: 0.6 },
  { id: 'triceps_larga', role: 'secundario', activation: 0.35 },
  { id: 'recto_abdominal', role: 'estabilizador', activation: 0.3 },
]);

describe('countedMuscles', () => {
  it('excluye los estabilizadores', () => {
    expect(countedMuscles(press).map((m) => m.id)).toEqual([
      'pectoral_esternal', 'pectoral_clavicular', 'triceps_lateral', 'triceps_larga',
    ]);
  });
});

describe('groupActivation', () => {
  it('es la activación máxima de los músculos del grupo', () => {
    expect(groupActivation(press, 'chest')).toBe(1);
    expect(groupActivation(press, 'triceps')).toBe(0.6);
  });
  it('vale 0 si el grupo no aparece', () => {
    expect(groupActivation(press, 'quads')).toBe(0);
  });
  it('vale 0 si el único músculo del grupo es estabilizador', () => {
    expect(groupActivation(press, 'core')).toBe(0);
  });
});

describe('muscleActivations', () => {
  it('incluye estabilizadores y toma el máximo entre ejercicios', () => {
    const otro = ex([
      { id: 'triceps_larga', role: 'principal', activation: 0.9 },
      { id: 'recto_abdominal', role: 'estabilizador', activation: 0.2 },
    ]);
    const a = muscleActivations([press, undefined, otro]);
    expect(a).toEqual({
      pectoral_esternal: 1,
      pectoral_clavicular: 0.8,
      triceps_lateral: 0.6,
      triceps_larga: 0.9,
      recto_abdominal: 0.3,
    });
  });
  it('sin ejercicios devuelve un objeto vacío', () => {
    expect(muscleActivations([])).toEqual({});
  });
});

describe('activationBand', () => {
  it('0,8 y 0,4 caen en el tramo superior', () => {
    expect(activationBand(1)).toBe('high');
    expect(activationBand(0.8)).toBe('high');
    expect(activationBand(0.79)).toBe('mid');
    expect(activationBand(0.4)).toBe('mid');
    expect(activationBand(0.39)).toBe('low');
    expect(activationBand(0.1)).toBe('low');
  });
});

describe('muscleRows', () => {
  it('ordena por activación descendente y redondea el porcentaje', () => {
    const rows = muscleRows(
      ex([
        { id: 'triceps_lateral', role: 'secundario', activation: 0.65 },
        { id: 'pectoral_esternal', role: 'principal', activation: 1 },
        { id: 'triceps_larga', role: 'secundario', activation: 0.349 },
      ]),
    );
    expect(rows.map((r) => r.id)).toEqual(['pectoral_esternal', 'triceps_lateral', 'triceps_larga']);
    expect(rows.map((r) => r.percent)).toEqual([100, 65, 35]);
  });

  it('incluye los estabilizadores con su rol', () => {
    const rows = muscleRows(press);
    expect(rows.at(-1)).toEqual({ id: 'recto_abdominal', role: 'estabilizador', percent: 30, band: 'low' });
    expect(rows[0]).toEqual({ id: 'pectoral_esternal', role: 'principal', percent: 100, band: 'high' });
  });

  it('los empates mantienen el orden original (orden estable)', () => {
    const rows = muscleRows(
      ex([
        { id: 'triceps_lateral', role: 'secundario', activation: 0.5 },
        { id: 'triceps_medial', role: 'secundario', activation: 0.5 },
        { id: 'triceps_larga', role: 'secundario', activation: 0.5 },
      ]),
    );
    expect(rows.map((r) => r.id)).toEqual(['triceps_lateral', 'triceps_medial', 'triceps_larga']);
  });

  it('0,995 se muestra como 100 %', () => {
    const [row] = muscleRows(ex([{ id: 'pectoral_esternal', role: 'principal', activation: 0.995 }]));
    expect(row.percent).toBe(100);
  });

  it('la banda se calcula con la activación sin redondear (0,795 → mid aunque percent = 80)', () => {
    const [row] = muscleRows(ex([{ id: 'pectoral_esternal', role: 'principal', activation: 0.795 }]));
    expect(row.percent).toBe(80);
    expect(row.band).toBe('mid');
  });
});
