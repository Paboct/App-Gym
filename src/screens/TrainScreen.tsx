import { Play, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { startWorkout } from '../data/repo';
import { effectivePlan } from '../domain/calc';
import { useT } from '../lib/settings';
import { useActiveMeso } from '../lib/useActiveMeso';

/** Pestaña "Entrenar": lo que toca hoy, a un toque. */
export function TrainScreen() {
  const t = useT();
  const navigate = useNavigate();
  const active = useActiveMeso();

  if (active === undefined) return <div className="screen" />;

  if (active === null) {
    return (
      <div className="screen">
        <h1>{t('tabTrain')}</h1>
        <div className="empty">
          <span className="emoji">🏋️</span>
          <p>{t('trainNoMesocycle')}</p>
          <Link className="btn primary" to="/meso/new">
            <Plus size={18} /> {t('createMesocycle')}
          </Link>
        </div>
      </div>
    );
  }

  const { meso, days, planned, micro, nextDay, inProgress } = active;
  const dayIndex = (id: string) => days.findIndex((d) => d.id === id) + 1;

  if (inProgress) {
    const day = days.find((d) => d.id === inProgress.dayId);
    return (
      <div className="screen">
        <h1>{t('tabTrain')}</h1>
        <div className="card accent col">
          <p className="eyebrow">{t('workoutInProgress')}</p>
          <h2>{day?.name}</h2>
          <p className="small muted">{t('weekN', { n: inProgress.micro })}</p>
          <Link className="btn primary lg block" to={`/workout/${inProgress.id}`}>
            <Play size={20} /> {t('continue')}
          </Link>
        </div>
      </div>
    );
  }

  const pending = days.filter(
    (d) => !active.workouts.some((w) => w.dayId === d.id && w.micro === micro && w.status === 'done'),
  );

  return (
    <div className="screen">
      <h1>{t('tabTrain')}</h1>
      <p className="small muted">
        {meso.name} · {t('microOfTotal', { n: micro, total: meso.microcycles })}
        {meso.deloadMicro === micro ? ` · ${t('deload')}` : ''}
      </p>

      {nextDay ? (
        <div className="card accent col">
          <p className="eyebrow">
            {t('nextUp')} · {t('dayN', { n: dayIndex(nextDay.id) })}
          </p>
          <h2>{nextDay.name}</h2>
          <p className="small muted">
            {t('exercisesAndSets', {
              e: planned.filter((p) => p.dayId === nextDay.id).length,
              s: planned.filter((p) => p.dayId === nextDay.id).reduce((acc, p) => acc + effectivePlan(p, meso, micro).sets, 0),
            })}
          </p>
          <button
            className="btn primary lg block"
            disabled={planned.every((p) => p.dayId !== nextDay.id)}
            onClick={async () => navigate(`/workout/${await startWorkout(meso.id, nextDay.id, micro)}`)}
          >
            <Play size={20} /> {t('startWorkout')}
          </button>
          <Link className="btn ghost block" to={`/day/${nextDay.id}?micro=${micro}`}>
            {t('viewDay')}
          </Link>
        </div>
      ) : (
        <div className="empty">
          <span className="emoji">🏛️</span>
          <h2>{t('mesocycleCompleteTitle')}</h2>
          <p>{t('mesocycleCompleteText')}</p>
          <Link className="btn gold" to={`/history/${meso.id}`}>
            {t('viewMesocycle')}
          </Link>
        </div>
      )}

      {pending.length > 1 && (
        <>
          <div className="section-title">
            <h3>{t('otherPendingDays')}</h3>
          </div>
          <div className="list">
            {pending
              .filter((d) => d.id !== nextDay?.id)
              .map((d) => (
                <Link key={d.id} className="card tap" to={`/day/${d.id}?micro=${micro}`}>
                  <p className="eyebrow">{t('dayN', { n: dayIndex(d.id) })}</p>
                  <strong>{d.name}</strong>
                </Link>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
