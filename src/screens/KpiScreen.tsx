import { useLiveQuery } from 'dexie-react-hooks';
import { Award, Flame, Timer, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BodyMap } from '../components/BodyMap';
import { LineChart } from '../components/LineChart';
import { db } from '../data/db';
import { formatDuration, formatWeight } from '../domain/calc';
import {
  TIERS,
  avgDurationSec,
  groupByWorkout,
  groupScore,
  muscleColorsFromScores,
  recordStats,
  tierForScore,
  volumeByMicro,
  volumeGlobal,
  weekStreak,
  weeklySetsByGroup,
  type GroupScore,
  type ScoreContext,
} from '../domain/kpi';
import { GROUPS, GROUP_NAMES, type GroupId } from '../domain/muscles';
import type { Exercise } from '../domain/types';
import { exerciseName, useSettings, useT } from '../lib/settings';

export function KpiScreen() {
  const t = useT();
  const { lang, unit, figure } = useSettings();
  const [scope, setScope] = useState<string>('global'); // 'global' o id de mesociclo
  const [exerciseId, setExerciseId] = useState<string | null>(null);

  const data = useLiveQuery(async () => {
    const [workouts, sets, exerciseList, prs, mesos, favorites, bodyWeights] = await Promise.all([
      db.workouts.toArray(),
      db.sets.toArray(),
      db.exercises.toArray(),
      db.prs.toArray(),
      db.mesocycles.toArray(),
      db.favorites.toArray(),
      db.bodyWeights.orderBy('date').reverse().limit(1).toArray(),
    ]);
    return { workouts, sets, exercises: exerciseList, prs, mesos, favorites, bodyWeightKg: bodyWeights[0]?.kg ?? null };
  }, []);

  const computed = useMemo(() => {
    if (!data) return null;
    const exMap = new Map(data.exercises.map((e) => [e.id, e]));
    const byWorkout = groupByWorkout(data.workouts, data.sets);
    const meso = scope === 'global' ? null : (data.mesos.find((m) => m.id === scope) ?? null);
    const scoped = meso ? byWorkout.filter((d) => d.workout.mesocycleId === meso.id) : byWorkout;

    // Semanas del ámbito: microciclos con datos (meso) o semanas distintas (global).
    let weeks: number;
    if (meso) {
      weeks = new Set(scoped.map((d) => d.workout.micro)).size || 1;
    } else {
      weeks = new Set(scoped.map((d) => weekKey(d.workout.date))).size || 1;
    }

    const ctx: ScoreContext = { data: scoped, exercises: exMap, bodyWeightKg: data.bodyWeightKg, meso, weeks };
    const scores = new Map<GroupId, GroupScore>(GROUPS.map((g) => [g, groupScore(ctx, g)]));
    const colors = muscleColorsFromScores(scores);
    const weeklySets = weeklySetsByGroup(ctx);

    // Ejercicios con datos en el ámbito, para el desplegable de la gráfica.
    const withData = [...new Set(scoped.flatMap((d) => d.sets.map((s) => s.exerciseId)))]
      .map((id) => exMap.get(id))
      .filter((e): e is Exercise => !!e)
      .sort((a, b) => exerciseName(a, lang).localeCompare(exerciseName(b, lang), lang));

    const records = recordStats(data.prs);
    return {
      exMap,
      byWorkout,
      meso,
      scoped,
      scores,
      colors,
      weeklySets,
      withData,
      records,
      streak: weekStreak(data.workouts),
      avgDur: avgDurationSec(data.workouts),
      doneCount: byWorkout.length,
    };
  }, [data, scope, lang]);

  if (!data || !computed) return <div className="screen" />;

  const { meso, exMap, byWorkout, scores, colors, weeklySets, withData, records, streak, avgDur, doneCount } = computed;
  const mesoName = (id: string) => data.mesos.find((m) => m.id === id)?.name ?? '—';

  // Ejercicio elegido para la gráfica: el guardado si tiene datos, o el primero.
  const chartExId = exerciseId && withData.some((e) => e.id === exerciseId) ? exerciseId : (withData[0]?.id ?? null);
  const chartPoints = chartExId
    ? meso
      ? volumeByMicro(chartExId, meso, byWorkout)
      : volumeGlobal(chartExId, byWorkout)
    : [];

  const rankedGroups = [...scores.values()].filter((s) => s.score != null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const favorites = data.favorites
    .map((f) => exMap.get(f.exerciseId))
    .filter((e): e is Exercise => !!e)
    .slice(0, 4);

  if (doneCount === 0) {
    return (
      <div className="screen">
        <h1>{t('tabKpis')}</h1>
        <div className="empty">
          <span className="emoji">📊</span>
          <p>{t('kpisEmpty')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <h1>{t('tabKpis')}</h1>

      {/* Ámbito: global o un mesociclo */}
      <div className="chips">
        <button className={`chip${scope === 'global' ? ' active' : ''}`} onClick={() => setScope('global')}>
          {t('global')}
        </button>
        {data.mesos
          .slice()
          .sort((a, b) => b.createdAt - a.createdAt)
          .map((m) => (
            <button key={m.id} className={`chip${scope === m.id ? ' active' : ''}`} onClick={() => setScope(m.id)}>
              {m.name}
            </button>
          ))}
      </div>

      {/* Ranking muscular */}
      <div className="card col">
        <div className="section-title" style={{ marginTop: 0 }}>
          <h3>{t('muscleRanking')}</h3>
          <span className="tiny faint">{meso ? meso.name : t('global')}</span>
        </div>
        <BodyMap figure={figure} colors={colors} size="md" frontLabel={t('bodyFront')} backLabel={t('bodyBack')} />
        <div className="chips wrap" style={{ justifyContent: 'center' }}>
          {TIERS.map((tier) => (
            <span key={tier.id} className="tiny" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <i style={{ width: 10, height: 10, borderRadius: 3, background: tier.color, display: 'inline-block' }} />
              {lang === 'es' ? tier.es : tier.en}
            </span>
          ))}
        </div>
        {!data.bodyWeightKg && <p className="notice">{t('rankNeedsBodyweight')}</p>}
        <p className="tiny faint">{t('rankProvisional')}</p>
      </div>

      {/* Lista de grupos por rango */}
      {rankedGroups.length > 0 && (
        <div className="card col" style={{ gap: 6 }}>
          {rankedGroups.map((g) => {
            const tier = tierForScore(g.score);
            return (
              <div key={g.group} className="row between">
                <span className="row" style={{ gap: 8 }}>
                  <i style={{ width: 10, height: 10, borderRadius: 3, background: tier?.color, display: 'inline-block' }} />
                  {GROUP_NAMES[g.group][lang]}
                </span>
                <span className="row" style={{ gap: 8 }}>
                  <span className="tiny faint">{t('setsPerWeekShort', { n: g.weeklySets.toFixed(1) })}</span>
                  <span className="badge" style={{ color: tier?.color, borderColor: tier?.color }}>
                    {tier ? (lang === 'es' ? tier.es : tier.en) : '—'}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Evolución de volumen por ejercicio */}
      <div className="card col">
        <div className="section-title" style={{ marginTop: 0 }}>
          <h3>
            <TrendingUp size={18} style={{ verticalAlign: '-3px', marginRight: 6 }} />
            {t('volumeEvolution')}
          </h3>
        </div>
        {withData.length === 0 ? (
          <p className="small muted">{t('noDataScope')}</p>
        ) : (
          <>
            <select className="input" value={chartExId ?? ''} onChange={(e) => setExerciseId(e.target.value)}>
              {withData.map((e) => (
                <option key={e.id} value={e.id}>
                  {exerciseName(e, lang)}
                </option>
              ))}
            </select>
            <LineChart points={chartPoints} unit={unit} format={(v) => formatWeight(v, unit, lang)} />
            <p className="tiny faint center">{meso ? t('volumeByMicroNote') : t('volumeGlobalNote')}</p>
          </>
        )}
      </div>

      {/* Favoritos fijados */}
      {favorites.length > 0 && (
        <div className="card col">
          <h3>⭐ {t('favorites')}</h3>
          {favorites.map((e) => {
            const pts = volumeGlobal(e.id, byWorkout);
            return (
              <div key={e.id} className="col" style={{ gap: 2 }}>
                <span className="small">{exerciseName(e, lang)}</span>
                {pts.length > 0 ? (
                  <LineChart points={pts} unit={unit} format={(v) => formatWeight(v, unit, lang)} height={110} />
                ) : (
                  <span className="tiny faint">{t('noDataYet')}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Récords */}
      <div className="card col">
        <h3>
          <Award size={18} style={{ verticalAlign: '-3px', marginRight: 6, color: 'var(--gold)' }} />
          {t('records')}
        </h3>
        <div className="stat-grid">
          <div className="stat">
            <div className="value">🏆 {records.total}</div>
            <span className="label muted">{t('totalPrs')}</span>
          </div>
          <div className="stat">
            <div className="value">{records.byMicro[0] ? `×${records.byMicro[0].count}` : '–'}</div>
            <span className="label muted">{t('bestMicro')}</span>
          </div>
          <div className="stat">
            <div className="value">{records.byMesocycle[0] ? `×${records.byMesocycle[0].count}` : '–'}</div>
            <span className="label muted">{t('bestMeso')}</span>
          </div>
        </div>
        {records.byMicro[0] && (
          <p className="tiny faint center">
            {t('bestMicroDetail', { meso: mesoName(records.byMicro[0].mesocycleId), n: records.byMicro[0].micro })}
          </p>
        )}
        {records.recent.length > 0 && (
          <div className="col" style={{ gap: 4 }}>
            {records.recent.slice(0, 6).map((pr) => (
              <div key={pr.id} className="row between small">
                <span className="truncate">🏆 {exerciseName(exMap.get(pr.exerciseId), lang)}</span>
                <span className="row" style={{ gap: 8 }}>
                  <span className="num" style={{ color: 'var(--gold)' }}>
                    {formatWeight(pr.e1rm, unit, lang)} {unit}
                  </span>
                  <span className="tiny faint">{pr.date.slice(5)}</span>
                </span>
              </div>
            ))}
          </div>
        )}
        {records.total === 0 && <p className="small muted">{t('noRecordsYet')}</p>}
      </div>

      {/* Series por grupo */}
      <div className="card col">
        <h3>{t('weeklySetsByGroup')}</h3>
        <div className="bars">
          {GROUPS.map((g) => {
            const v = weeklySets.get(g) ?? 0;
            const max = Math.max(1, ...[...weeklySets.values()]);
            return (
              <div className="bar-row" key={g}>
                <span className="truncate">{GROUP_NAMES[g][lang]}</span>
                <span className="num">{v.toFixed(1)}</span>
                <div className="bar-track">
                  <i style={{ width: `${(v / max) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <p className="tiny faint">{t('weeklySetsNote')}</p>
      </div>

      {/* Constancia */}
      <div className="stat-grid">
        <div className="stat">
          <div className="value">
            <Flame size={20} style={{ verticalAlign: '-3px' }} /> {streak}
          </div>
          <span className="label muted">{t('weekStreak')}</span>
        </div>
        <div className="stat">
          <div className="value">{doneCount}</div>
          <span className="label muted">{t('totalWorkouts')}</span>
        </div>
        <div className="stat">
          <div className="value">
            <Timer size={18} style={{ verticalAlign: '-2px' }} /> {avgDur > 0 ? formatDuration(avgDur) : '–'}
          </div>
          <span className="label muted">{t('avgDuration')}</span>
        </div>
      </div>
    </div>
  );
}

/** Clave de semana (YYYY-WW aproximada) para contar semanas distintas. */
function weekKey(dateIso: string): number {
  const [y, m, d] = dateIso.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / (7 * 24 * 3600 * 1000));
}
