import { useEffect, useState } from 'react';
import { APP_NAME, APP_SLOGAN } from '../config';
import { Wordmark } from './Wordmark';

const VISIBLE_MS = 1900;
const FADE_MS = 450;

/**
 * Pantalla de bienvenida al abrir la app. Cuando llegue el inicio de sesión,
 * los botones de acceso irán aquí, bajo el lema.
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

  const words = APP_SLOGAN.split(' ');
  const last = words.pop();

  return (
    <div className={`splash${leaving ? ' leaving' : ''}`} onClick={() => setLeaving(true)} role="img" aria-label={`${APP_NAME}. ${APP_SLOGAN}`}>
      <div className="splash-top">
        <img className="splash-logo" src="./logo.svg" alt="" />
        <Wordmark className="splash-wordmark" />
      </div>
      <p className="splash-slogan">
        {words.join(' ')}
        <br />
        <b>{last}.</b>
      </p>
      <div className="splash-tagline">Train · Track · Improve</div>
      {/* Cumbre con una figura en lo alto, como en el boceto. */}
      <svg className="splash-peak" viewBox="0 0 400 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs>
          <radialGradient id="splash-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0" stop-color="#5b5f66" stop-opacity="0.55" />
            <stop offset="1" stop-color="#0b0b0c" stop-opacity="0" />
          </radialGradient>
        </defs>
        <rect width="400" height="260" fill="url(#splash-glow)" />
        <polygon points="0,260 0,200 60,150 110,185 150,140 200,190 260,150 320,195 360,160 400,190 400,260" fill="#1b1c1f" />
        <polygon points="0,260 40,225 95,240 150,170 185,120 200,92 216,118 250,165 300,235 350,222 400,250 400,260" fill="#0f1012" />
        <polygon points="200,92 216,118 207,128 211,150 196,138 190,160 185,120" fill="#18191c" />
        <g fill="#050506">
          <circle cx="200" cy="66" r="3.4" />
          <path d="M196.2 71h7.6l1.2 12h-2.2l-.6 9.5h-1.6l-.6-8-.6 8h-1.6l-.6-9.5h-2.2z" />
        </g>
      </svg>
    </div>
  );
}
