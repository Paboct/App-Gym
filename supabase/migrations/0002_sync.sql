-- Legacy · ajuste para la sincronización
--
-- La primera migración ponía un disparador que, en cada UPDATE, sobrescribía
-- `updated_at` con la hora del servidor. Para que la sincronización resuelva
-- los conflictos a favor del cambio más reciente, cada dispositivo manda su
-- propia marca de tiempo y la base de datos debe respetarla. Por eso aquí se
-- quitan esos disparadores: `updated_at` pasa a controlarlo la app.
--
-- Ejecutar en el editor SQL de Supabase después de 0001_init.sql.

do $$
declare
  t text;
begin
  foreach t in array array[
    'custom_exercises', 'favorites', 'mesocycles', 'routine_days', 'planned_exercises',
    'workouts', 'workout_exercises', 'set_logs', 'pr_records', 'body_weights', 'user_settings'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_set_updated_at', t);
  end loop;
end;
$$;

-- Índice para bajar solo lo que ha cambiado desde la última sincronización.
create index if not exists favorites_sync_updated on public.favorites (user_id, updated_at);
