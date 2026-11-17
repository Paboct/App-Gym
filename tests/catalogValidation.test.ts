import { describe, expect, it } from 'vitest';
import type { CatalogExerciseData, CatalogFile } from '../src/domain/catalogSchema';
import { validateCatalog } from '../src/domain/catalogValidation';

const MUSCLE_IDS = ['pectoral_esternal', 'deltoides_anterior', 'triceps_lateral'];

function ex(over: Partial<CatalogExerciseData> = {}): CatalogExerciseData {
  return {
    id: 'bench_press',
    nombre: 'Press de banca',
    nombre_en: 'Bench press',
    grupo: 'chest',
    equipamiento: 'barbell',
    unilateral: false,
    patron_movimiento: 'Empuje horizontal',
    patron_movimiento_en: 'Horizontal push',
    mecanica: 'Compuesto',
    musculos: [
      { musculo_id: 'pectoral_esternal', rol: 'principal', activacion: 1 },
      { musculo_id: 'deltoides_anterior', rol: 'secundario', activacion: 0.55 },
      { musculo_id: 'triceps_lateral', rol: 'estabilizador', activacion: 0.2 },
    ],
    descripcion: 'Acuéstate en el banco y empuja la barra.',
    descripcion_en: 'Lie on the bench and press the bar.',
    confianza: 'alta',
    fuentes: ['EMG study'],
    ...over,
  };
}

function file(...ejercicios: CatalogExerciseData[]): CatalogFile {
  return { version: '1', ejercicios };
}

const opts = { muscleIds: MUSCLE_IDS, requiredIds: [] as string[] };
const errs = (f: CatalogFile, o = opts) => validateCatalog(f, o);

describe('validateCatalog', () => {
  it('un archivo válido devuelve []', () => {
    expect(errs(file(ex()))).toEqual([]);
  });

  it('músculo desconocido', () => {
    const e = errs(
      file(ex({ musculos: [{ musculo_id: 'xx', rol: 'principal', activacion: 1 }] })),
    );
    expect(e.some((m) => m.startsWith('bench_press:') && m.includes('músculo desconocido'))).toBe(true);
  });

  it('sin músculo principal', () => {
    const e = errs(
      file(ex({ musculos: [{ musculo_id: 'pectoral_esternal', rol: 'secundario', activacion: 1 }] })),
    );
    expect(e.join('|')).toContain('sin músculo principal');
  });

  it('principal por debajo de 0,8', () => {
    const e = errs(
      file(
        ex({
          musculos: [
            { musculo_id: 'pectoral_esternal', rol: 'principal', activacion: 0.7 },
            { musculo_id: 'deltoides_anterior', rol: 'secundario', activacion: 0.9 },
          ],
        }),
      ),
    );
    expect(e.join('|')).toContain('principal por debajo de 0,8');
  });

  it('principal exactamente 0,8 es válido', () => {
    const e = errs(
      file(
        ex({
          musculos: [
            { musculo_id: 'pectoral_esternal', rol: 'principal', activacion: 0.8 },
            { musculo_id: 'deltoides_anterior', rol: 'secundario', activacion: 0.85 },
          ],
        }),
      ),
    );
    expect(e).toEqual([]);
  });

  it('activación fuera de rango', () => {
    for (const a of [0, -0.1, 1.2]) {
      const e = errs(
        file(
          ex({
            musculos: [
              { musculo_id: 'pectoral_esternal', rol: 'principal', activacion: 1 },
              { musculo_id: 'deltoides_anterior', rol: 'secundario', activacion: a },
            ],
          }),
        ),
      );
      expect(e.join('|')).toContain('activación fuera de rango');
    }
  });

  it('músculo repetido', () => {
    const e = errs(
      file(
        ex({
          musculos: [
            { musculo_id: 'pectoral_esternal', rol: 'principal', activacion: 1 },
            { musculo_id: 'pectoral_esternal', rol: 'secundario', activacion: 0.5 },
          ],
        }),
      ),
    );
    expect(e.join('|')).toContain('músculo repetido');
  });

  it('ninguna activación ≥ 0,85', () => {
    const e = errs(
      file(
        ex({
          musculos: [
            { musculo_id: 'pectoral_esternal', rol: 'secundario', activacion: 0.8 },
            { musculo_id: 'deltoides_anterior', rol: 'secundario', activacion: 0.5 },
          ],
        }),
      ),
    );
    expect(e.join('|')).toContain('ninguna activación ≥ 0,85');
  });

  it('descripción vacía, vacía en inglés o idéntica', () => {
    expect(errs(file(ex({ descripcion: ' ' }))).join('|')).toContain('descripción');
    expect(errs(file(ex({ descripcion_en: '' }))).join('|')).toContain('descripción');
    expect(errs(file(ex({ descripcion_en: 'Acuéstate en el banco y empuja la barra.' }))).join('|')).toContain(
      'descripción',
    );
  });

  it('nombre_en vacío', () => {
    expect(errs(file(ex({ nombre_en: ' ' }))).join('|')).toContain('nombre_en');
  });

  it('confianza inválida y fuentes vacías', () => {
    expect(errs(file(ex({ confianza: 'mala' as never }))).join('|')).toContain('confianza');
    expect(errs(file(ex({ fuentes: [] }))).join('|')).toContain('fuentes');
    expect(errs(file(ex({ fuentes: [], confianza: 'baja' })))).toEqual([]);
  });

  it('id duplicado', () => {
    expect(errs(file(ex(), ex())).join('|')).toContain('id duplicado');
  });

  it('falta el id requerido', () => {
    const e = errs(file(ex()), { muscleIds: MUSCLE_IDS, requiredIds: ['bench_press', 'otro'] });
    expect(e).toEqual([expect.stringContaining('otro')]);
    expect(e[0]).toContain('falta el id');
  });

  it('grupo y equipamiento fuera de lo permitido', () => {
    expect(errs(file(ex({ grupo: 'legs' as never }))).join('|')).toContain('grupo');
    expect(errs(file(ex({ equipamiento: 'kettlebell' as never }))).join('|')).toContain('equipamiento');
  });
});
