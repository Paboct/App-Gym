import { EQUIPMENT, GROUPS } from './muscles';
import type { CatalogFile } from './catalogSchema';

const ROLES = ['principal', 'secundario', 'estabilizador'];
const CONFIDENCE = ['alta', 'media', 'baja'];

/** Valida un catálogo con activación. Devuelve una frase por error, que empieza por el id. */
export function validateCatalog(
  file: CatalogFile,
  opts: { muscleIds: string[]; requiredIds: string[] },
): string[] {
  const errors: string[] = [];
  const muscles = new Set(opts.muscleIds);
  const seen = new Set<string>();

  for (const e of file.ejercicios) {
    const err = (msg: string) => errors.push(`${e.id}: ${msg}`);

    if (seen.has(e.id)) err('id duplicado');
    seen.add(e.id);

    if (!(GROUPS as readonly string[]).includes(e.grupo)) err(`grupo no permitido (${e.grupo})`);
    if (!(EQUIPMENT as readonly string[]).includes(e.equipamiento))
      err(`equipamiento no permitido (${e.equipamiento})`);
    if (!e.nombre_en?.trim()) err('nombre_en vacío');
    if (!e.descripcion?.trim() || !e.descripcion_en?.trim() || e.descripcion === e.descripcion_en)
      err('descripción vacía o sin traducir');
    if (!CONFIDENCE.includes(e.confianza)) err(`confianza no válida (${e.confianza})`);
    if (!e.fuentes?.length && e.confianza !== 'baja') err('fuentes vacías con confianza no baja');

    const ids = new Set<string>();
    let hasPrincipal = false;
    let max = 0;
    for (const m of e.musculos ?? []) {
      if (!muscles.has(m.musculo_id)) err(`músculo desconocido (${m.musculo_id})`);
      if (ids.has(m.musculo_id)) err(`músculo repetido (${m.musculo_id})`);
      ids.add(m.musculo_id);
      if (!ROLES.includes(m.rol)) err(`rol no válido (${m.rol})`);
      if (!(m.activacion > 0 && m.activacion <= 1))
        err(`activación fuera de rango (${m.musculo_id}: ${m.activacion})`);
      if (m.rol === 'principal') {
        hasPrincipal = true;
        if (m.activacion < 0.8) err(`principal por debajo de 0,8 (${m.musculo_id}: ${m.activacion})`);
      }
      if (m.activacion > max) max = m.activacion;
    }
    if (!hasPrincipal) err('sin músculo principal');
    if (max < 0.85) err('ninguna activación ≥ 0,85');
  }

  for (const id of opts.requiredIds) if (!seen.has(id)) errors.push(`${id}: falta el id`);
  return errors;
}
