-- Legacy · músculos con activación en los ejercicios propios
--
-- El catálogo pasa de 22 músculos (principal/secundario) a 35 con un coeficiente
-- de activación y un rol (principal, secundario o estabilizador). Los ejercicios
-- propios del usuario viajan a la nube con ese formato en una columna nueva:
--
--   muscles = [ { "id": "pectoral_esternal", "role": "principal", "activation": 1 }, ... ]
--
-- Las columnas `primary_muscles` y `secondary_muscles` se conservan (la app las
-- manda vacías) para que los dispositivos con la versión anterior sigan
-- funcionando y para poder leer las filas antiguas.
--
-- Aplicar A MANO en el editor SQL del proyecto «Legacy» de Supabase, después de
-- 0003_fix_active_index.sql y ANTES de sincronizar con la versión nueva de la app:
-- hasta entonces, subir `custom_exercises` falla y bloquea todo el empuje.
-- Es idempotente: se puede ejecutar más de una vez.

alter table public.custom_exercises add column if not exists muscles jsonb;
