import { describe, expect, it } from 'vitest';
import { LEGACY_MUSCLE_MAP, convertLegacyMuscles } from '../src/domain/legacyMuscles';
import { MUSCLES } from '../src/domain/muscles';

const OLD_IDS = [
  'chest_upper', 'chest_mid', 'chest_lower', 'delt_front', 'delt_side', 'delt_rear', 'traps_upper', 'traps_mid',
  'upper_back', 'lats', 'lower_back', 'biceps', 'triceps', 'forearm', 'abs', 'obliques', 'glute_max', 'glute_med',
  'quads', 'hamstrings', 'adductors', 'calves',
];

describe('mapa de músculos antiguos (22 → 35)', () => {
  it('contiene los 22 ids antiguos y ningún otro', () => {
    expect(Object.keys(LEGACY_MUSCLE_MAP).sort()).toEqual([...OLD_IDS].sort());
  });

  it('ningún destino fuera de los 35 músculos', () => {
    const known = new Set<string>(MUSCLES);
    for (const [old, targets] of Object.entries(LEGACY_MUSCLE_MAP)) {
      expect(targets.length, old).toBeGreaterThan(0);
      for (const t of targets) expect(known.has(t), `${old} → ${t}`).toBe(true);
    }
  });

  it('cada id antiguo va a su destino acordado', () => {
    expect(LEGACY_MUSCLE_MAP).toEqual({
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
    });
  });
});

describe('convertLegacyMuscles', () => {
  it('principal 1,0 y secundarios 0,5, expandiendo los ids que se dividen', () => {
    const out = convertLegacyMuscles(['chest_mid'], ['delt_front', 'triceps']);
    expect(out).toEqual([
      { id: 'pectoral_esternal', role: 'principal', activation: 1 },
      { id: 'deltoides_anterior', role: 'secundario', activation: 0.5 },
      { id: 'triceps_larga', role: 'secundario', activation: 0.5 },
      { id: 'triceps_lateral', role: 'secundario', activation: 0.5 },
      { id: 'triceps_medial', role: 'secundario', activation: 0.5 },
    ]);
  });

  it('si un músculo sale principal y secundario, gana el principal', () => {
    const out = convertLegacyMuscles(['traps_mid'], ['traps_mid', 'traps_upper']);
    expect(out).toEqual([
      { id: 'trapecio_medio', role: 'principal', activation: 1 },
      { id: 'trapecio_inferior', role: 'principal', activation: 1 },
      { id: 'trapecio_superior', role: 'secundario', activation: 0.5 },
    ]);
  });

  it('ignora ids desconocidos y no repite músculos', () => {
    const out = convertLegacyMuscles(['quads', 'quads', 'nope'], ['calves', 'calves']);
    expect(out.map((m) => m.id)).toEqual(['cuadriceps_vastos', 'recto_femoral', 'gastrocnemio', 'soleo']);
  });
});
