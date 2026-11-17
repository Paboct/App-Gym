import type { CatalogFile } from '../domain/catalogSchema';
import type { MuscleId } from '../domain/muscles';
import type { Exercise } from '../domain/types';
import data from './catalog.json';

/**
 * Catálogo propio de ejercicios con coeficientes de activación por músculo.
 * `catalog.json` sale de `data/catalogo/ejercicios.json` sin `fuentes` (se regenera con
 * `node scripts/catalogo/generar-catalog-json.mjs`; el contenido se valida en
 * tests/catalogData.test.ts). Los ids son estables:
 * no se deben cambiar, porque los entrenos guardados y las imágenes apuntan a ellos.
 */
export const CATALOG: Exercise[] = (data as CatalogFile).ejercicios.map((e) => ({
  id: e.id,
  nameEs: e.nombre,
  nameEn: e.nombre_en,
  group: e.grupo,
  equipment: e.equipamiento,
  muscles: e.musculos.map((m) => ({ id: m.musculo_id as MuscleId, role: m.rol, activation: m.activacion })),
  unilateral: e.unilateral,
  custom: false,
  updatedAt: 0,
  descriptionEs: e.descripcion,
  descriptionEn: e.descripcion_en,
  patternEs: e.patron_movimiento,
  patternEn: e.patron_movimiento_en,
  mechanics: e.mecanica,
  confidence: e.confianza,
}));
