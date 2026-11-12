import { Capacitor } from '@capacitor/core';
import { Haptics } from '@capacitor/haptics';

/** Vibra con un patrón [vibrar, pausa, vibrar…] en ms. En navegadores sin soporte no hace nada. */
export async function vibrate(pattern: number[]): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      for (let i = 0; i < pattern.length; i++) {
        if (i % 2 === 0) await Haptics.vibrate({ duration: pattern[i] });
        await new Promise((resolve) => setTimeout(resolve, pattern[i]));
      }
      return;
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
  } catch {
    // Sin vibración disponible: no es un error para el usuario.
  }
}
