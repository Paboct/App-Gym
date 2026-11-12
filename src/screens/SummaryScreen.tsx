import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { MuscleSummary } from '../components/MuscleSummary';
import { db } from '../data/db';
import { formatDuration, formatE1rm, formatWeight, totalVolume } from '../domain/calc';
import { phraseFor } from '../domain/phrases';
import type { Exercise, SetLog, Workout } from '../domain/types';
import { muscleLevels } from '../lib/muscles';
import { exerciseName, useSettings, useT } from '../lib/settings';

function formatDate(iso: string, lang: 'es' | 'en'): string {
  const [y, m, d] = iso.split('-').map(Number);
  const text = new Date(y, m - 1, d).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Resumen de un entreno terminado. Con `?fresh=1` (recién acabado) añade la celebración. */
export function SummaryScreen() {
  const t = useT();
  const { lang, unit } = useSettings();
  const navigate = useNavigate();
  const { workoutId = '' } = useParams();
  const [params] = useSearchParams();
  const fresh = params.get('fresh') === '1';

  const data = useLiveQuery(async () => {
    const workout = await db.workouts.get(workoutId);
    if (!workout) return null;
    const [day, meso, wes, sets, prs] = await Promise.all([
      db.days.get(workout.dayId),
      db.mesocycles.get(workout.mesocycleId),
      db.workoutExercises.where('workoutId').equals(workoutId).sortBy('order'),
      db.sets.where('workoutId').equals(workoutId).toArray(),
      db.prs.where('workoutId').equals(workoutId).toArray(),
    ]);
    const list = await db.exercises.bulkGet([...new Set(wes.map((w) => w.exerciseId))]);
    const exercises = new Map(list.filter((e): e is Exercise => !!e).map((e) => [e.id, e]));
    // Entreno anterior del mismo día, para comparar el volumen por ejercicio.
    const sameDay = (await db.workouts.where('dayId').equals(workout.dayId).toArray())
      .filter((w) => w.status === 'done' && w.id !== workout.id && w.micro < workout.micro)
      .sort((a, b) => b.micro - a.micro);
    const previous: Workout | undefined = sameDay[0];
    const previousSets: SetLog[] = previous ? await db.sets.where('workoutId').equals(previous.id).toArray() : [];
    return { workout, day, meso, wes, sets, prs, exercises, previous, previousSets };
  }, [workoutId]);

  if (data === undefined) return <div className="screen" />;
  if (data === null) {
    return (
      <div className="screen">
        <p className="muted">{t('notFound')}</p>
        <Link className="btn" to="/">
          {t('back')}
        </Link>
      </div>
    );
  }

  const { workout, day, meso, wes, sets, prs, exercises, previous, previousSets } = data;
  const workSets = sets.filter((s) => s.kind === 'work' && s.done);
  const volume = totalVolume(sets);
  const previousVolume = totalVolume(previousSets);
  const perExercise = wes
    .map((we) => {
      const own = sets.filter((s) => s.workoutExerciseId === we.id).sort((a, b) => a.index - b.index);
      const prev = totalVolume(previousSets.filter((s) => s.exerciseId === we.exerciseId));
      return { we, sets: own, volume: totalVolume(own), prev };
    })
    .filter((row) => row.sets.length > 0);
  const maxVolume = Math.max(1, ...perExercise.map((r) => Math.max(r.volume, r.prev)));
  const delta = previousVolume > 0 ? Math.round(((volume - previousVolume) / previousVolume) * 100) : null;
  const num = (kg: number) => Math.round(unit === 'kg' ? kg : kg / 0.45359237).toLocaleString(lang === 'es' ? 'es-ES' : 'en-US');

  return (
    <div className="screen">
      <div className="topbar">
        <button
          className="icon-btn"
          onClick={() => (fresh ? navigate('/', { replace: true }) : navigate(-1))}
          aria-label={t('back')}
        >
          <ArrowLeft />
        </button>
        <div className="grow">
          <p className="eyebrow">
            {meso?.name} · {t('weekN', { n: workout.micro })}
          </p>
          <h1 className="truncate">{day?.name ?? t('workout')}</h1>
        </div>
      </div>

      {fresh && (
        <div className="hero">
          <span className="emoji">{prs.length > 0 ? '🏆' : '💪'}</span>
          <h2>{prs.length > 0 ? t('summaryTitlePr') : t('summaryTitle')}</h2>
          <p className="quote">{phraseFor(workout.id, lang)}</p>
        </div>
      )}

      <p className="small muted center">
        {formatDate(workout.date, lang)}
      </p>

      <div className="stat-grid">
        <div className="stat">
          <div className="value">{workout.backfilled ? '–' : formatDuration(workout.durationSec)}</div>
          <span className="label muted">⏱ {t('duration')}</span>
        </div>
        <div className="stat">
          <div className="value">{num(volume)}</div>
          <span className="label muted">
            🏋️ {t('volume')} ({unit})
          </span>
        </div>
        <div className="stat">
          <div className="value">{workSets.length}</div>
          <span className="label muted">🔥 {t('setsDone')}</span>
        </div>
      </div>

      {delta != null && previous && (
        <p className="center small">
          <span className={`badge ${delta >= 0 ? 'ok' : 'red'}`}>
            {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} %
          </span>{' '}
          <span className="muted">{t('volumeVsWeek', { n: previous.micro })}</span>
        </p>
      )}

      {prs.length > 0 && (
        <div className="card accent col">
          <h3>🏆 {t('newRecords')}</h3>
          {prs.map((pr) => (
            <div key={pr.id} className="row between">
              <div className="grow">
                <strong className="truncate">{exerciseName(exercises.get(pr.exerciseId), lang)}</strong>
                <div className="small muted">
                  {formatWeight(pr.weight, unit, lang)} {unit} × {pr.reps}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="num" style={{ fontSize: '1.4rem', color: 'var(--gold)' }}>
                  {formatE1rm(pr.e1rm, unit, lang)} {unit}
                </div>
                <div className="tiny faint">{t('estimated1rm')}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card col">
        <div className="section-title" style={{ marginTop: 0 }}>
          <h3>📊 {t('volumeByExercise')}</h3>
          {previous && <span className="tiny faint">{t('greyIsWeek', { n: previous.micro })}</span>}
        </div>
        <div className="bars">
          {perExercise.map((row) => (
            <div className="bar-row" key={row.we.id}>
              <span className="truncate">{exerciseName(exercises.get(row.we.exerciseId), lang)}</span>
              <span className="num">
                {num(row.volume)} {unit}
              </span>
              <div className="bar-track">
                {row.prev > 0 && <i className="prev" style={{ width: `${(row.prev / maxVolume) * 100}%` }} />}
                <i style={{ width: `${(row.volume / maxVolume) * 100}%`, opacity: 0.9 }} />
              </div>
            </div>
          ))}
        </div>
        <p className="notice">{t('volumeNotice')}</p>
      </div>

      <div className="card">
        <MuscleSummary levels={muscleLevels(wes.map((we) => exercises.get(we.exerciseId)))} size="sm" />
      </div>

      <h3>{t('setsDetail')}</h3>
      <div className="list">
        {perExercise.map((row) => {
          const ex = exercises.get(row.we.exerciseId);
          const trophy = prs.some((p) => p.exerciseId === row.we.exerciseId);
          let work = 0;
          let warm = 0;
          return (
            <div className="card" key={row.we.id} style={{ padding: 12 }}>
              <div className="row between">
                <strong className="truncate">
                  {trophy ? '🏆 ' : ''}
                  {exerciseName(ex, lang)}
                </strong>
                {ex?.unilateral && <span className="badge gold">{t('perSide')}</span>}
              </div>
              <table className="set-table" style={{ marginTop: 6 }}>
                <thead>
                  <tr>
                    <th>{t('set')}</th>
                    <th>{unit}</th>
                    <th>{t('reps')}</th>
                    <th>RIR</th>
                  </tr>
                </thead>
                <tbody>
                  {row.sets.map((s) => (
                    <tr key={s.id} className={s.kind === 'warmup' ? 'warm' : ''}>
                      <td>{s.kind === 'warmup' ? t('warmupShort', { n: ++warm }) : ++work}</td>
                      <td>{s.weight != null ? formatWeight(s.weight, unit, lang) : '–'}</td>
                      <td>
                        {s.reps ?? '–'}
                        {s.drops.length > 0 && (
                          <span className="tiny faint">
                            {' '}
                            + {s.drops.map((d) => `${formatWeight(d.weight, unit, lang)}×${d.reps}`).join(' + ')}
                          </span>
                        )}
                      </td>
                      <td>{s.rir ?? '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {row.we.notes && <p className="tiny faint" style={{ marginTop: 6 }}>{row.we.notes}</p>}
            </div>
          );
        })}
      </div>

      {fresh && (
        <Link className="btn primary lg block" to="/" replace>
          {t('backToRoutine')}
        </Link>
      )}
    </div>
  );
}
