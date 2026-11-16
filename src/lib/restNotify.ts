import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const NOTIFICATION_ID = 9001;
const CHANNEL_ID = 'rest-timer';

let channelReady = false;

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

async function ensureChannel(): Promise<void> {
  if (channelReady) return;
  await LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: 'Descanso entre series',
    description: 'Avisa cuando termina el descanso',
    importance: 5,
    visibility: 1,
    vibration: true,
  });
  channelReady = true;
}

async function ensurePermission(): Promise<boolean> {
  const current = await LocalNotifications.checkPermissions();
  if (current.display === 'granted') return true;
  if (current.display === 'denied') return false;
  const asked = await LocalNotifications.requestPermissions();
  return asked.display === 'granted';
}

/** Programa (o reprograma) el aviso de fin de descanso. Funciona con la pantalla apagada. */
export async function scheduleRestNotification(endsAt: number, title: string, body: string): Promise<void> {
  if (!isNative()) return;
  try {
    if (!(await ensurePermission())) return;
    await ensureChannel();
    await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_ID }] });
    await LocalNotifications.schedule({
      notifications: [
        {
          id: NOTIFICATION_ID,
          title,
          body,
          channelId: CHANNEL_ID,
          schedule: { at: new Date(endsAt), allowWhileIdle: true },
        },
      ],
    });
  } catch {
    // Sin notificaciones disponibles: el descanso sigue funcionando dentro de la app.
  }
}

export async function cancelRestNotification(): Promise<void> {
  if (!isNative()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_ID }] });
  } catch {
    // Nada que cancelar.
  }
}
