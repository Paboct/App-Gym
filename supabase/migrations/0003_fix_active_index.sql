-- Legacy · arreglo de la sincronización de mesociclos
--
-- La migración 0001 creaba un índice único que impedía tener dos mesociclos
-- «activos» a la vez (mesocycles_one_active). Esa regla choca con la
-- sincronización: al subir en el mismo lote el mesociclo que acabas de
-- archivar y el nuevo activo, hay un instante en que coinciden dos activos y
-- la base de datos lo rechaza.
--
-- La app ya garantiza por su cuenta que solo haya un mesociclo activo (al
-- crear o duplicar uno, archiva el anterior), así que esta regla sobra.
--
-- Ejecutar en el editor SQL de Supabase después de 0002_sync.sql.

drop index if exists public.mesocycles_one_active;
