import { useEffect, useState, useSyncExternalStore } from 'react';
import { cancelRestNotification, scheduleRestNotification } from './restNotify';

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

// Textos de la notificación; la app los fija según el idioma elegido.
let notifyText = { title: 'Descanso terminado', body: '¡A por la siguiente!' };

export function setRestNotificationText(title: string, body: string): void {
  notifyText = { title, body };
}

function syncNotification(): void {
  if (state) void scheduleRestNotification(state.endsAt, notifyText.title, notifyText.body);
  else void cancelRestNotification();
}

export function startRest(totalSec: number): void {
  state = totalSec > 0 ? { endsAt: Date.now() + totalSec * 1000, totalSec, notified: false } : null;
  syncNotification();
  emit();
}

/** Suma o resta segundos al descanso en curso (el tiempo restante nunca baja de 0). */
export function extendRest(deltaSec: number): void {
  if (!state) return;
  const now = Date.now();
  const endsAt = Math.max(now, Math.max(state.endsAt, now) + deltaSec * 1000);
  state = { endsAt, totalSec: Math.max(1, state.totalSec + deltaSec), notified: false };
  syncNotification();
  emit();
}

export function clearRest(): void {
  state = null;
  syncNotification();
  emit();
}

export function markRestNotified(): void {
  if (state && !state.notified) {
    state = { ...state, notified: true };
    emit();
  }
}

export function getRest(): RestState | null {
  return state;
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
