-- Legacy · esquema inicial en Supabase (PostgreSQL)
--
-- Refleja las tablas locales de la app (src/domain/types.ts). Cada fila es de
-- un usuario y solo él puede leerla o modificarla (RLS). Los pesos van en kg.
-- `updated_at` y `deleted_at` permiten sincronizar con el móvil sin conexión:
-- gana el cambio más reciente y los borrados se propagan como marcas.
--
-- Los ejercicios del catálogo viven dentro de la app (ids de texto como
-- 'bench_press'); aquí solo se guardan los creados por el usuario. Por eso
-- `exercise_id` es texto sin clave foránea.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ───────────── Ejercicios propios y favoritos ─────────────

create table public.custom_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name_es text not null,
  name_en text not null,
  muscle_group text not null,
  equipment text not null,
  primary_muscles text[] not null default '{}',
  secondary_muscles text[] not null default '{}',
  unilateral boolean not null default false,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.favorites (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_id text not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, exercise_id)
);

-- ───────────── Mesociclos, días y plan ─────────────

create table public.mesocycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  microcycles smallint not null check (microcycles between 1 and 16),
  deload_micro smallint check (deload_micro is null or deload_micro between 1 and microcycles),
  status text not null check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Un único mesociclo activo por usuario.
create unique index mesocycles_one_active on public.mesocycles (user_id)
  where status = 'active' and deleted_at is null;

create table public.routine_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mesocycle_id uuid not null references public.mesocycles (id) on delete cascade,
  position smallint not null,
  name text not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.planned_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mesocycle_id uuid not null references public.mesocycles (id) on delete cascade,
  day_id uuid not null references public.routine_days (id) on delete cascade,
  position smallint not null,
  exercise_id text not null,
  sets smallint not null check (sets >= 1),
  rep_min smallint not null check (rep_min >= 1),
  rep_max smallint not null check (rep_max >= rep_min),
  target_rir smallint check (target_rir is null or target_rir between 8 and 10),
  rest_sec integer not null default 120,
  notes text not null default '',
  -- Variaciones por microciclo: {"3": 5}, {"6": 8}, {"2": "db_bench_press"}
  sets_by_micro jsonb not null default '{}',
  rir_by_micro jsonb not null default '{}',
  exercise_by_micro jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ───────────── Entrenos ─────────────

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mesocycle_id uuid not null references public.mesocycles (id) on delete cascade,
  day_id uuid not null references public.routine_days (id) on delete cascade,
  micro smallint not null check (micro >= 1),
  workout_date date not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  duration_sec integer not null default 0,
  status text not null check (status in ('in_progress', 'done')),
  backfilled boolean not null default false,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workout_id uuid not null references public.workouts (id) on delete cascade,
  planned_exercise_id uuid references public.planned_exercises (id) on delete set null,
  exercise_id text not null,
  position smallint not null,
  rep_min smallint not null,
  rep_max smallint not null,
  target_rir smallint check (target_rir is null or target_rir between 8 and 10),
  rest_sec integer not null default 120,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.set_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workout_id uuid not null references public.workouts (id) on delete cascade,
  workout_exercise_id uuid not null references public.workout_exercises (id) on delete cascade,
  exercise_id text not null,
  position smallint not null,
  kind text not null check (kind in ('warmup', 'work')),
  weight_kg numeric(7, 3),
  reps smallint,
  rir smallint check (rir is null or rir between 8 and 10),
  -- Bajadas del dropset (máx. 3): [{"weight": 40, "reps": 6}]. No cuentan para volumen ni récords.
  drops jsonb not null default '[]' check (jsonb_array_length(drops) <= 3),
  done boolean not null default false,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Récords de 1RM estimado, ligados al microciclo donde se consiguieron.
create table public.pr_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_id text not null,
  e1rm_kg numeric(7, 3) not null,
  weight_kg numeric(7, 3) not null,
  reps smallint not null,
  pr_date date not null,
  workout_id uuid not null references public.workouts (id) on delete cascade,
  mesocycle_id uuid not null references public.mesocycles (id) on delete cascade,
  micro smallint not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ───────────── Peso corporal y ajustes ─────────────

create table public.body_weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  weight_date date not null,
  kg numeric(6, 2) not null check (kg > 0),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, weight_date)
);

create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  lang text not null default 'es' check (lang in ('es', 'en')),
  theme text not null default 'dark' check (theme in ('system', 'dark', 'light')),
  unit text not null default 'kg' check (unit in ('kg', 'lb')),
  figure text not null default 'male' check (figure in ('male', 'female')),
  updated_at timestamptz not null default now()
);

-- ───────────── Índices para sincronizar y para los KPIs ─────────────

create index routine_days_meso on public.routine_days (mesocycle_id);
create index planned_exercises_day on public.planned_exercises (day_id);
create index workouts_meso on public.workouts (mesocycle_id, micro);
create index workouts_user_date on public.workouts (user_id, workout_date);
create index workout_exercises_workout on public.workout_exercises (workout_id);
create index set_logs_workout on public.set_logs (workout_id);
create index set_logs_user_exercise on public.set_logs (user_id, exercise_id);
create index pr_records_user_exercise on public.pr_records (user_id, exercise_id);

-- ───────────── Seguridad por filas y `updated_at` automático ─────────────

do $$
declare
  t text;
begin
  foreach t in array array[
    'custom_exercises', 'favorites', 'mesocycles', 'routine_days', 'planned_exercises',
    'workouts', 'workout_exercises', 'set_logs', 'pr_records', 'body_weights', 'user_settings'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t || '_own_rows', t
    );
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t
    );
    execute format('create index %I on public.%I (user_id, updated_at)', t || '_sync', t);
  end loop;
end;
$$;
