import type { Table } from 'dexie';
import { db, uid } from './db';
import { supabase } from './supabase';
import { SYNC_TABLES, toIso } from './syncMap';

/**
 * Sincronización entre la base de datos local (Dexie) y la nube (Supabase).
 *
 * Modelo: cada dispositivo manda a la nube lo que ha cambiado (empuje) y se
 * trae lo que han cambiado los demás (bajada), resolviendo a favor de la marca
 * de tiempo más reciente. Los borrados se marcan con `deleted_at` para que el
 * resto de dispositivos también los apliquen. La app funciona sin conexión;
 * esto solo corre cuando hay sesión iniciada y red.
 */

const PULLED_KEY = '__sync_pulled_at';
const PUSHED_KEY = '__sync_pushed_at';
const LAST_KEY = '__sync_last';
const PAGE = 1000;
const OVERLAP_MS = 60_000; // margen para no perder filas por desfases de reloj

let running = false;
const listeners = new Set<() => void>();

export interface SyncStatus {
  running: boolean;
  lastAt: number | null;
  lastError: string | null;
}

let status: SyncStatus = { running: false, lastAt: null, lastError: null };

export function getSyncStatus(): SyncStatus {
  return status;
}

export function subscribeSync(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  listeners.forEach((l) => l());
}

async function getMeta<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key);
  return row ? (row.value as T) : fallback;
}

async function setMeta(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}

// Nombre del almacén local → nombre de la tabla en la nube (para los borrados).
const STORE_TO_REMOTE = new Map(SYNC_TABLES.map((t) => [t.store, t.remote]));

function store(name: string): Table {
  return (db as unknown as Record<string, Table>)[name];
}

async function push(): Promise<void> {
  const since = await getMeta<number>(PUSHED_KEY, 0);
  const startedAt = Date.now();

  for (const t of SYNC_TABLES) {
    const all = await store(t.store).toArray();
    const rows = all.filter((r) => {
      if (t.store === 'exercises' && !(r as { custom?: boolean }).custom) return false; // el catálogo no viaja
      return (r as { updatedAt: number }).updatedAt > since;
    });
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500).map((r) => t.toRemote(r));
      const { error } = await supabase.from(t.remote).upsert(chunk);
      if (error) throw new Error(`${t.remote}: ${error.message}`);
    }
  }

  // Borrados pendientes: se marcan como borrados en la nube (tumba), agrupados por tabla.
  const deletions = await db.deletions.toArray();
  const byTable = new Map<string, string[]>();
  for (const d of deletions) {
    const remote = STORE_TO_REMOTE.get(d.table);
    if (!remote) continue;
    (byTable.get(remote) ?? byTable.set(remote, []).get(remote)!).push(d.id);
  }
  const nowIso = toIso(Date.now());
  for (const [remote, ids] of byTable) {
    for (let i = 0; i < ids.length; i += 200) {
      const slice = ids.slice(i, i + 200);
      const { error } = await supabase.from(remote).update({ deleted_at: nowIso, updated_at: nowIso }).in('id', slice);
      if (error) throw new Error(`${remote} (borrado): ${error.message}`);
    }
  }
  await db.deletions.clear();

  await pushFavorites();
  await setMeta(PUSHED_KEY, startedAt);
}

/** Favoritos: la nube queda igual que el dispositivo (añade los nuevos, quita los que ya no están). */
async function pushFavorites(): Promise<void> {
  const local = await db.favorites.toArray();
  const ids = local.map((f) => f.exerciseId);
  if (ids.length > 0) {
    const { error } = await supabase
      .from('favorites')
      .upsert(local.map((f) => ({ exercise_id: f.exerciseId, updated_at: toIso(f.updatedAt) })), {
        onConflict: 'user_id,exercise_id',
        ignoreDuplicates: true,
      });
    if (error) throw new Error(`favorites: ${error.message}`);
  }
  const del = supabase.from('favorites').delete();
  const query = ids.length > 0 ? del.not('exercise_id', 'in', `(${ids.join(',')})`) : del.neq('exercise_id', '');
  const { error } = await query;
  if (error) throw new Error(`favorites (limpieza): ${error.message}`);
}

async function pull(): Promise<void> {
  const pulledAt = await getMeta<number>(PULLED_KEY, 0);
  const sinceIso = pulledAt > 0 ? toIso(Math.max(0, pulledAt - OVERLAP_MS)) : null;
  let maxSeen = pulledAt;

  for (const t of SYNC_TABLES) {
    for (let page = 0; ; page++) {
      let query = supabase.from(t.remote).select('*').order('updated_at', { ascending: true }).range(page * PAGE, page * PAGE + PAGE - 1);
      if (sinceIso) query = query.gt('updated_at', sinceIso);
      const { data, error } = await query;
      if (error) throw new Error(`${t.remote} (bajada): ${error.message}`);
      const rows = data ?? [];
      for (const r of rows) {
        const updatedMs = new Date(r.updated_at as string).getTime();
        maxSeen = Math.max(maxSeen, updatedMs);
        if (r.deleted_at) {
          await store(t.store).delete(r.id as string);
          continue;
        }
        const local = await store(t.store).get(r.id as string);
        if (!local || (local as { updatedAt: number }).updatedAt <= updatedMs) {
          await store(t.store).put(t.toLocal(r));
        }
      }
      if (rows.length < PAGE) break;
    }
  }

  await pullFavorites();
  await setMeta(PULLED_KEY, maxSeen);
}

async function pullFavorites(): Promise<void> {
  const { data, error } = await supabase.from('favorites').select('exercise_id');
  if (error) throw new Error(`favorites (bajada): ${error.message}`);
  for (const r of data ?? []) {
    const id = r.exercise_id as string;
    if (!(await db.favorites.get(id))) await db.favorites.put({ exerciseId: id, updatedAt: Date.now() });
  }
}

/**
 * Sincroniza una vez: primero baja los cambios de la nube y luego sube los
 * locales. Si no hay sesión o falla la red, no rompe nada; la app sigue local.
 * Devuelve true si fue bien.
 */
export async function syncNow(): Promise<boolean> {
  if (running) return false;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return false;

  running = true;
  status = { ...status, running: true, lastError: null };
  emit();
  try {
    await pull();
    await push();
    status = { running: false, lastAt: Date.now(), lastError: null };
    await setMeta(LAST_KEY, status.lastAt);
    return true;
  } catch (e) {
    status = { ...status, running: false, lastError: e instanceof Error ? e.message : String(e) };
    return false;
  } finally {
    running = false;
    emit();
  }
}

/** Borra los punteros y los datos locales al cerrar sesión (los datos siguen en la nube). */
export async function clearLocalData(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.mesocycles,
      db.days,
      db.planned,
      db.workouts,
      db.workoutExercises,
      db.sets,
      db.prs,
      db.bodyWeights,
      db.favorites,
      db.deletions,
      db.settings,
      db.exercises,
    ],
    async () => {
      await Promise.all([
        db.mesocycles.clear(),
        db.days.clear(),
        db.planned.clear(),
        db.workouts.clear(),
        db.workoutExercises.clear(),
        db.sets.clear(),
        db.prs.clear(),
        db.bodyWeights.clear(),
        db.favorites.clear(),
        db.deletions.clear(),
        db.exercises.filter((e) => e.custom === true).delete(),
      ]);
      await db.settings.bulkDelete([PULLED_KEY, PUSHED_KEY, LAST_KEY]);
    },
  );
}

export async function loadLastSync(): Promise<number | null> {
  const last = await getMeta<number | null>(LAST_KEY, null);
  status = { ...status, lastAt: last };
  return last;
}

export { uid };
