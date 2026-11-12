import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Copy, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Sheet } from '../components/Sheet';
import { db } from '../data/db';
import { deleteMesocycle, duplicateMesocycle, finishMesocycle } from '../data/repo';
import { formatE1rm, formatWeight, totalVolume } from '../domain/calc';
import type { Exercise } from '../domain/types';
import { exerciseName, useSettings, useT } from '../lib/settings';
import { shortDate } from './HistoryScreen';

/** Un mesociclo por dentro: cuadrícula día × microciclo, récords y acciones. */
export function MesocycleHistoryScreen() {
  const t = useT();
  const { lang, unit } = useSettings();
  const navigate = useNavigate();
  const { mesocycleId = '' } = useParams();
  const [duplicating, setDuplicating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState('');

  const data = useLiveQuery(async () => {
    const meso = await db.mesocycles.get(mesocycleId);
    if (!meso) return null;
    const [days, workouts, prs, hasActive] = await Promise.all([
      db.days.where('mesocycleId').equals(mesocycleId).sortBy('order'),
      db.workouts.where('mesocycleId').equals(mesocycleId).toArray(),
      db.prs.where('mesocycleId').equals(mesocycleId).toArray(),
      db.mesocycles.where('status').equals('active').count(),
    ]);
    const done = workouts.filter((w) => w.status === 'done');
    const sets = (await Promise.all(done.map((w) => db.sets.where('workoutId').equals(w.id).toArray()))).flat();
    const list = await db.exercises.bulkGet([...new Set(prs.map((p) => p.exerciseId))]);
    const exercises = new Map(list.filter((e): e is Exercise => !!e).map((e) => [e.id, e]));
    return { meso, days, done, prs, volume: totalVolume(sets), exercises, hasActive: hasActive > 0 };
  }, [mesocycleId]);

  if (data === undefined) return <div className="screen" />;
  if (data === null) {
    return (
      <div className="screen">
        <p className="muted">{t('notFound')}</p>
        <Link className="btn" to="/history">
          {t('back')}
        </Link>
      </div>
    );
  }

  const { meso, days, done, prs, volume, exercises } = data;
  const micros = Array.from({ length: meso.microcycles }, (_, i) => i + 1);
  const volumeText = Math.round(unit === 'kg' ? volume : volume / 0.45359237).toLocaleString(lang === 'es' ? 'es-ES' : 'en-US');
  const prsByMicro = micros.map((n) => ({ n, list: prs.filter((p) => p.micro === n) })).filter((g) => g.list.length > 0);

  return (
    <div className="screen">
      <div className="topbar">
        <button className="icon-btn" onClick={() => navigate('/history')} aria-label={t('back')}>
          <ArrowLeft />
        </button>
        <div className="grow">
          <p className="eyebrow">
            {meso.status === 'active' ? t('activeMesocycle') : t('finished')} · {shortDate(meso.createdAt, lang)}
          </p>
          <h1 className="truncate">{meso.name}</h1>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <div className="value">
            {done.length}
            <span className="small faint">/{days.length * meso.microcycles}</span>
          </div>
          <span className="label muted">{t('workouts')}</span>
        </div>
        <div className="stat">
          <div className="value">{volumeText}</div>
          <span className="label muted">
            {t('volume')} ({unit})
          </span>
        </div>
        <div className="stat">
          <div className="value">🏆 {prs.length}</div>
          <span className="label muted">{t('records')}</span>
        </div>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <div className="micro-grid" style={{ gridTemplateColumns: `minmax(68px, 1.3fr) repeat(${micros.length}, minmax(32px, 1fr))` }}>
          <span />
          {micros.map((n) => (
            <span key={n} className="head">
              {t('weekShort', { n })}
              {meso.deloadMicro === n ? ' ↓' : ''}
            </span>
          ))}
          {days.map((day) => (
            <Row key={day.id} name={day.name}>
              {micros.map((n) => {
                const workout = done.find((w) => w.dayId === day.id && w.micro === n);
                const trophies = workout ? prs.filter((p) => p.workoutId === workout.id).length : 0;
                return workout ? (
                  <Link key={n} className="cell done" to={`/summary/${workout.id}`} aria-label={`${day.name} ${t('weekN', { n })}`}>
                    {trophies > 0 ? '🏆' : '✓'}
                  </Link>
                ) : (
                  <span key={n} className="cell">
                    ·
                  </span>
                );
              })}
            </Row>
          ))}
        </div>
        {meso.deloadMicro != null && <p className="tiny faint" style={{ marginTop: 8 }}>↓ {t('deloadWeek')}</p>}
      </div>

      {prsByMicro.length > 0 && (
        <div className="card col">
          <h3>🏆 {t('recordsByWeek')}</h3>
          {prsByMicro.map((group) => (
            <div key={group.n} className="col" style={{ gap: 4 }}>
              <span className="eyebrow">{t('weekN', { n: group.n })}</span>
              {group.list.map((pr) => (
                <div key={pr.id} className="row between small">
                  <span className="truncate">{exerciseName(exercises.get(pr.exerciseId), lang)}</span>
                  <span className="num">
                    {formatWeight(pr.weight, unit, lang)} × {pr.reps} → {formatE1rm(pr.e1rm, unit, lang)} {unit}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="col">
        <button
          className="btn gold block"
          onClick={() => {
            setName(`${meso.name} (2)`);
            setDuplicating(true);
          }}
        >
          <Copy size={16} /> {t('duplicateAsBase')}
        </button>
        {meso.status === 'active' && (
          <button className="btn ghost block" onClick={() => finishMesocycle(meso.id)}>
            {t('finishMesocycle')}
          </button>
        )}
        <button className="btn danger block" onClick={() => setDeleting(true)}>
          <Trash2 size={16} /> {t('deleteMesocycle')}
        </button>
      </div>

      {duplicating && (
        <Sheet title={t('duplicateAsBase')} onClose={() => setDuplicating(false)}>
          <p className="small muted">{t('duplicateHint')}</p>
          {data.hasActive && meso.status !== 'active' && <p className="notice">{t('duplicateArchivesActive')}</p>}
          <label className="field">
            <span>{t('mesocycleName')}</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </label>
          <button
            className="btn primary block"
            disabled={!name.trim()}
            onClick={async () => {
              await duplicateMesocycle(meso.id, name);
              navigate('/', { replace: true });
            }}
          >
            {t('createMesocycle')}
          </button>
        </Sheet>
      )}

      {deleting && (
        <Sheet title={t('deleteMesocycle')} onClose={() => setDeleting(false)}>
          <p className="muted">{t('deleteMesocycleConfirm', { name: meso.name, n: done.length })}</p>
          <div className="grid-2">
            <button className="btn ghost" onClick={() => setDeleting(false)}>
              {t('cancel')}
            </button>
            <button
              className="btn danger"
              onClick={async () => {
                await deleteMesocycle(meso.id);
                navigate('/history', { replace: true });
              }}
            >
              {t('delete')}
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function Row({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <>
      <span className="rowhead">{name}</span>
      {children}
    </>
  );
}
