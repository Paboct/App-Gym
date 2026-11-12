import { useEffect, useState, useSyncExternalStore } from 'react';

export interface RestState {
  endsAt: number;
  totalSec: number;
  notified: boolean;
}

// Vive fuera de React para que el descanso siga contando aunque cambies de pantalla.
let state: RestState | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function startRest(totalSec: number): void {
  state = totalSec > 0 ? { endsAt: Date.now() + totalSec * 1000, totalSec, notified: false } : null;
  emit();
}

export function extendRest(extraSec: number): void {
  if (!state) return;
  const base = Math.max(state.endsAt, Date.now());
  state = { endsAt: base + extraSec * 1000, totalSec: state.totalSec + extraSec, notified: false };
  emit();
}

export function clearRest(): void {
  state = null;
  emit();
}

export function markRestNotified(): void {
  if (state && !state.notified) {
    state = { ...state, notified: true };
    emit();
  }
}

export function useRest(): RestState | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}

/** Hora actual que se refresca cada `intervalMs` (para relojes y cuentas atrás). */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
