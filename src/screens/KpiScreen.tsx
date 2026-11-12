import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import { formatE1rm, formatWeight } from '../domain/calc';
import type { Exercise } from '../domain/types';
import { exerciseName, useSettings, useT } from '../lib/settings';

/**
 * Panel de KPIs. En esta versión solo muestra los récords conseguidos;
 * el ranking muscular y las gráficas llegan en la siguiente (ver docs/ESPECIFICACION.md).
 */
export function KpiScreen() {
  const t = useT();
  const { lang, unit } = useSettings();
  const data = useLiveQuery(async () => {
    const prs = (await db.prs.toArray()).sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt);
    const list = await db.exercises.bulkGet([...new Set(prs.map((p) => p.exerciseId))]);
    const mesos = new Map((await db.mesocycles.toArray()).map((m) => [m.id, m]));
    return { prs, exercises: new Map(list.filter((e): e is Exercise => !!e).map((e) => [e.id, e])), mesos };
  }, []);

  return (
    <div className="screen">
      <h1>{t('tabKpis')}</h1>

      <div className="card col">
        <h3>🏆 {t('records')}</h3>
        {data && data.prs.length === 0 && <p className="small muted">{t('noRecordsYet')}</p>}
        {data?.prs.slice(0, 30).map((pr) => (
          <div key={pr.id} className="row between">
            <div className="grow">
              <strong className="truncate">{exerciseName(data.exercises.get(pr.exerciseId), lang)}</strong>
              <div className="tiny faint truncate">
                {data.mesos.get(pr.mesocycleId)?.name} · {t('weekN', { n: pr.micro })} · {pr.date}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="num" style={{ color: 'var(--gold)' }}>
                {formatE1rm(pr.e1rm, unit, lang)} {unit}
              </div>
              <div className="tiny faint">
                {formatWeight(pr.weight, unit, lang)} × {pr.reps}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card col">
        <p className="eyebrow">{t('comingSoon')}</p>
        <p className="small muted">{t('kpisComingText')}</p>
      </div>
    </div>
  );
}
