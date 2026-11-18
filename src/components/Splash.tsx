import { useEffect, useState } from 'react';
import { APP_NAME, APP_SLOGAN } from '../config';

const VISIBLE_MS = 1900;
const FADE_MS = 450;

/**
 * Pantalla de bienvenida al abrir la app: una única imagen (`public/splash.jpg`,
 * 1080 × 2402) con logo, lema y cumbre. Cuando llegue el inicio de sesión, los
 * botones de acceso irán aquí, superpuestos sobre la imagen.
 */
export function Splash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setLeaving(true), VISIBLE_MS);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const id = setTimeout(onDone, FADE_MS);
    return () => clearTimeout(id);
  }, [leaving, onDone]);

  return (
    <div className={`splash${leaving ? ' leaving' : ''}`} onClick={() => setLeaving(true)} role="img" aria-label={`${APP_NAME}. ${APP_SLOGAN}`}>
      <img className="splash-image" src="./splash.jpg" alt="" />
    </div>
  );
}
