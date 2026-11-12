import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '../data/db';
import { useSettings, useT } from '../lib/settings';

export function shortDate(ms: number, lang: 'es' | 'en'): string {
  return new Date(ms).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Historial: todos los mesociclos, el activo primero y después los terminados. */
export function HistoryScreen() {
  const t = useT();
  const { lang } = useSettings();
  const rows = useLiveQuery(async () => {
    const mesos = await db.mesocycles.toArray();
    mesos.sort((a, b) => (a.status === b.status ? b.createdAt - a.createdAt : a.status === 'active' ? -1 : 1));
    return Promise.all(
      mesos.map(async (meso) => {
        const workouts = await db.workouts.where('mesocycleId').equals(meso.id).toArray();
        const prs = await db.prs.where('mesocycleId').equals(meso.id).count();
        const days = await db.days.where('mesocycleId').equals(meso.id).count();
        return { meso, done: workouts.filter((w) => w.status === 'done').length, prs, total: days * meso.microcycles };
      }),
    );
  }, []);

  return (
    <div className="screen">
      <h1>{t('tabHistory')}</h1>
      {rows && rows.length === 0 && (
        <div className="empty">
          <span className="emoji">📜</span>
          <p>{t('historyEmpty')}</p>
        </div>
      )}
      <div className="list">
        {rows?.map(({ meso, done, prs, total }) => (
          <Link key={meso.id} className={`card tap${meso.status === 'active' ? ' accent' : ''}`} to={`/history/${meso.id}`}>
            <div className="row between">
              <div className="grow">
                <p className="eyebrow">{meso.status === 'active' ? t('activeMesocycle') : t('finished')}</p>
                <h3 className="truncate">{meso.name}</h3>
                <p className="small muted">
                  {shortDate(meso.createdAt, lang)}
                  {meso.finishedAt ? ` – ${shortDate(meso.finishedAt, lang)}` : ''}
                </p>
                <p className="small muted">
                  {t('workoutsOfTotal', { done, total })} · {t('weeksCount', { n: meso.microcycles })}
                  {prs > 0 ? ` · 🏆 ${prs}` : ''}
                </p>
              </div>
              <ChevronRight className="faint" size={20} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
