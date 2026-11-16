import { useEffect } from 'react';
import { formatDuration } from '../domain/calc';
import { vibrate } from '../lib/haptics';
import { clearRest, extendRest, markRestNotified, setRestNotificationText, useNow, useRest } from '../lib/restTimer';
import { useT } from '../lib/settings';

/** Cuenta atrás del descanso entre series; vibra al terminar. */
export function RestBar() {
  const t = useT();
  const rest = useRest();
  const now = useNow(250);
  const remaining = rest ? Math.ceil((rest.endsAt - now) / 1000) : 0;
  const over = !!rest && remaining <= 0;

  useEffect(() => {
    setRestNotificationText(t('restOver'), t('goNextSet'));
  }, [t]);

  useEffect(() => {
    if (rest && over && !rest.notified) {
      markRestNotified();
      void vibrate([350, 150, 350, 150, 500]);
    }
  }, [rest, over]);

  if (!rest) return null;
  const progress = over ? 100 : Math.min(100, Math.max(0, (1 - remaining / rest.totalSec) * 100));

  return (
    <div className={`rest-bar${over ? ' over' : ''}`} role="timer" aria-live="off">
      <div className="row between">
        <div>
          <span className="tiny muted">{over ? t('restOver') : t('resting')}</span>
          <div className="clock" style={{ color: over ? 'var(--red-strong)' : undefined }}>
            {over ? t('goNextSet') : formatDuration(remaining)}
          </div>
        </div>
        <div className="row">
          {!over && (
            <>
              <button className="btn sm" onClick={() => extendRest(-15)} aria-label="-15 s">
                −15
              </button>
              <button className="btn sm" onClick={() => extendRest(15)} aria-label="+15 s">
                +15
              </button>
              <button className="btn sm" onClick={() => extendRest(30)} aria-label="+30 s">
                +30
              </button>
            </>
          )}
          <button className="btn sm gold" onClick={clearRest}>
            {over ? t('close') : t('skip')}
          </button>
        </div>
      </div>
      <div className="rest-track">
        <i style={{ width: `${progress}%`, background: over ? 'var(--red)' : undefined }} />
      </div>
    </div>
  );
}
