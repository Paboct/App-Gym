import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CompareChart, type CompareSeries } from '../components/CompareChart';
import { db } from '../data/db';
import { formatE1rm, formatWeight } from '../domain/calc';
import { compareMesocycles, exercisesWithTwoMicros, mesosWithData, microSeries, microSets, pickDefaultPair } from '../domain/compare';
import { groupByWorkout } from '../domain/kpi';
import { GROUP_NAMES } from '../domain/muscles';
import type { Mesocycle } from '../domain/types';
import { exerciseName, useSettings, useT } from '../lib/settings';

const COLOR_A = 'var(--red)';
const COLOR_B = 'var(--gold)';

/** Flecha y diferencia: ▲ verde si sube, ▼ roja si baja. */
function Delta({ value, suffix = '' }: { value: number; suffix?: string }): ReactNode {
  const r = Math.round(value);
  if (r === 0) return <span className="faint">=</span>;
  return (
    <span style={{ color: r > 0 ? 'var(--ok)' : 'var(--red-strong)', fontWeight: 700 }}>
      {r > 0 ? '▲ +' : '▼ −'}
      {Math.abs(r)}
      {suffix}
    </span>
  );
}

export function CompareScreen() {
  const t = useT();
  const { lang, unit } = useSettings();
  const [mode, setMode] = useState<'mesos' | 'micros'>('mesos');
  const [aSel, setASel] = useState<string | null>(null);
  const [bSel, setBSel] = useState<string | null>(null);
  const [openEx, setOpenEx] = useState<string | null>(null);
  const [metric, setMetric] = useState<'e1rm' | 'volume'>('e1rm');
  const [mesoSel, setMesoSel] = useState<string | null>(null);
  const [exSel, setExSel] = useState<string | null>(null);
  const [microASel, setMicroASel] = useState<number | null>(null);
  const [microBSel, setMicroBSel] = useState<number | null>(null);

  const data = useLiveQuery(async () => {
    const [workouts, sets, exercises, prs, mesos, bodyWeights] = await Promise.all([
      db.workouts.toArray(),
      db.sets.toArray(),
      db.exercises.toArray(),
      db.prs.toArray(),
      db.mesocycles.toArray(),
      db.bodyWeights.orderBy('date').reverse().limit(1).toArray(),
    ]);
    return { workouts, sets, exercises, prs, mesos, bodyWeightKg: bodyWeights[0]?.kg ?? null };
  }, []);

  const base = useMemo(() => {
    if (!data) return null;
    const byWorkout = groupByWorkout(data.workouts, data.sets);
    const exMap = new Map(data.exercises.map((e) => [e.id, e]));
    const valid = mesosWithData(data.mesos, byWorkout);
    return { byWorkout, exMap, valid, pair: pickDefaultPair(data.mesos, byWorkout) };
  }, [data]);

  if (!data || !base) return <div className="screen" />;
  const { byWorkout, exMap, valid, pair } = base;

  const byId = (id: string | null): Mesocycle | undefined => valid.find((m) => m.id === id);
  const mesoA = byId(aSel) ?? pair?.a;
  const mesoB = byId(bSel) ?? pair?.b;
  const nameOf = (id: string) => exerciseName(exMap.get(id), lang);

  const header = (
    <>
      <Link to="/kpis" className="row small muted" style={{ gap: 2, textDecoration: 'none' }}>
        <ChevronLeft size={16} />
        {t('tabKpis')}
      </Link>
      <h1>{t('compareTitle')}</h1>
    </>
  );

  if (valid.length === 0) {
    return (
      <div className="screen">
        {header}
        <div className="empty">
          <p>{t('kpisEmpty')}</p>
        </div>
      </div>
    );
  }

  const modeSwitch = (
    <div className="segmented">
      <button className={mode === 'mesos' ? 'active' : ''} onClick={() => setMode('mesos')}>
        {t('compareMesos')}
      </button>
      <button className={mode === 'micros' ? 'active' : ''} onClick={() => setMode('micros')}>
        {t('compareMicros')}
      </button>
    </div>
  );

  // ───────── Modo Mesociclos ─────────
  if (mode === 'mesos') {
    if (!mesoA || !mesoB) {
      return (
        <div className="screen">
          {header}
          {modeSwitch}
          <p className="notice">{t('compareChooseTwo')}</p>
        </div>
      );
    }
    const same = mesoA.id === mesoB.id;
    const cmp = same ? null : compareMesocycles(mesoA, mesoB, { data: byWorkout, exercises: exMap, prs: data.prs, bodyWeightKg: data.bodyWeightKg });
    const picker = (tag: string, color: string, value: string, onChange: (id: string) => void) => (
      <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <span className="tiny" style={{ color, fontWeight: 700 }}>
          {tag}
        </span>
        <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
          {valid.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
    );
    const columnHeader = (
      <div className="row between tiny" style={{ fontWeight: 700 }}>
        <span style={{ flex: 1 }} />
        <span style={{ width: 44, textAlign: 'right', color: COLOR_A }}>A</span>
        <span style={{ width: 44, textAlign: 'right', color: COLOR_B }}>B</span>
        <span style={{ width: 84 }} />
      </div>
    );
    const fmt1rm = (kg: number) => `${formatE1rm(kg, unit, lang)} ${unit}`;
    const chartSeries = (exId: string): CompareSeries[] =>
      [
        { m: mesoA, color: COLOR_A },
        { m: mesoB, color: COLOR_B },
      ].map(({ m, color }) => ({
        label: m.name,
        color,
        points: microSeries(exId, m, byWorkout, metric)
          .filter((p) => p.value > 0)
          .map((p) => ({ x: p.key, y: p.value })),
      }));

    return (
      <div className="screen">
        {header}
        {modeSwitch}
        <div className="row" style={{ gap: 8 }}>
          {picker('A', COLOR_A, mesoA.id, setASel)}
          {picker('B', COLOR_B, mesoB.id, setBSel)}
        </div>

        {!cmp ? (
          <p className="notice">{t('compareChooseTwo')}</p>
        ) : (
          <>
            <div className="card col">
              <h3>{t('records')}</h3>
              <div className="row between">
                <span>
                  <b style={{ color: COLOR_A }}>A</b> <b>{cmp.records.a}</b>
                </span>
                <span>
                  <b style={{ color: COLOR_B }}>B</b> <b>{cmp.records.b}</b>
                </span>
                <Delta value={cmp.records.b - cmp.records.a} />
              </div>
            </div>

            <div className="card col" style={{ gap: 6 }}>
              <h3>{t('compareGroupScores')}</h3>
              {columnHeader}
              {cmp.groups.map((g) => (
                <div key={g.group} className="row between small">
                  <span style={{ flex: 1 }}>{GROUP_NAMES[g.group][lang]}</span>
                  <span style={{ width: 44, textAlign: 'right' }}>{g.a == null ? '—' : Math.round(g.a)}</span>
                  <span style={{ width: 44, textAlign: 'right' }}>{g.b == null ? '—' : Math.round(g.b)}</span>
                  <span style={{ width: 84, textAlign: 'right' }}>
                    {g.a == null ? <span className="faint">{t('compareOnlyB')}</span> : g.b == null ? <span className="faint">{t('compareOnlyA')}</span> : <Delta value={g.b - g.a} />}
                  </span>
                </div>
              ))}
            </div>

            <div className="card col" style={{ gap: 6 }}>
              <h3>
                {t('compareExercisesCommon')} ({cmp.common.length})
              </h3>
              {cmp.common.length === 0 ? (
                <p className="small muted">{t('compareNoCommon')}</p>
              ) : (
                <>
                  <p className="tiny faint">{t('compareTapExercise')}</p>
                  <div className="row between tiny" style={{ fontWeight: 700 }}>
                    <span style={{ flex: 1 }} />
                    <span style={{ width: 70, textAlign: 'right', color: COLOR_A }}>A</span>
                    <span style={{ width: 70, textAlign: 'right', color: COLOR_B }}>B</span>
                    <span style={{ width: 64 }} />
                  </div>
                  {cmp.common.map((c) => (
                    <div key={c.exerciseId} className="col" style={{ gap: 6 }}>
                      <button
                        className="row between small"
                        style={{ background: 'none', border: 0, color: 'inherit', padding: '4px 0', textAlign: 'left', cursor: 'pointer' }}
                        onClick={() => setOpenEx(openEx === c.exerciseId ? null : c.exerciseId)}
                      >
                        <span style={{ flex: 1 }}>{nameOf(c.exerciseId)}</span>
                        <span style={{ width: 70, textAlign: 'right' }}>{fmt1rm(c.a)}</span>
                        <span style={{ width: 70, textAlign: 'right' }}>{fmt1rm(c.b)}</span>
                        <span style={{ width: 64, textAlign: 'right' }}>
                          <Delta value={c.changePct} suffix=" %" />
                        </span>
                      </button>
                      {openEx === c.exerciseId && (
                        <>
                          <div className="segmented">
                            <button className={metric === 'e1rm' ? 'active' : ''} onClick={() => setMetric('e1rm')}>
                              {t('compareMetric1rm')}
                            </button>
                            <button className={metric === 'volume' ? 'active' : ''} onClick={() => setMetric('volume')}>
                              {t('compareMetricVolume')}
                            </button>
                          </div>
                          <CompareChart
                            series={chartSeries(c.exerciseId)}
                            xLabel={(x) => `S${x}`}
                            format={(v) => (metric === 'e1rm' ? fmt1rm(v) : `${formatWeight(v, unit, lang)} ${unit}`)}
                          />
                        </>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // ───────── Modo Microciclos ─────────
  const mesoM = byId(mesoSel) ?? valid.find((m) => m.status === 'active') ?? valid[0];
  const exMicros = exercisesWithTwoMicros(mesoM.id, byWorkout);
  const exOptions = [...exMicros.keys()].sort((x, y) => nameOf(x).localeCompare(nameOf(y), lang));
  const exId = exSel && exMicros.has(exSel) ? exSel : (exOptions[0] ?? null);
  const micros = exId ? (exMicros.get(exId) ?? []) : [];
  const microA = microASel != null && micros.includes(microASel) ? microASel : micros[micros.length - 2];
  const microB = microBSel != null && micros.includes(microBSel) ? microBSel : micros[micros.length - 1];
  const microSeriesList: CompareSeries[] =
    exId && microA != null && microB != null
      ? [
          { micro: microA, color: COLOR_A },
          { micro: microB, color: COLOR_B },
        ].map(({ micro, color }) => ({
          label: t('compareMicroWeek', { n: micro }),
          color,
          points: microSets(exId, mesoM.id, micro, byWorkout).map((p) => ({
            x: p.n,
            y: p.weight,
            tag: `${formatWeight(p.weight, unit, lang)} × ${p.reps}`,
          })),
        }))
      : [];

  return (
    <div className="screen">
      {header}
      {modeSwitch}
      <select className="input" value={mesoM.id} onChange={(e) => setMesoSel(e.target.value)}>
        {valid.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      {!exId ? (
        <p className="notice">{t('compareNeedTwoMicros')}</p>
      ) : (
        <div className="card col">
          <select className="input" value={exId} onChange={(e) => setExSel(e.target.value)}>
            {exOptions.map((id) => (
              <option key={id} value={id}>
                {nameOf(id)}
              </option>
            ))}
          </select>
          <div className="row" style={{ gap: 8 }}>
            {[
              { v: microA, set: setMicroASel },
              { v: microB, set: setMicroBSel },
            ].map((s, i) => (
              <select key={i} className="input" value={s.v} onChange={(e) => s.set(Number(e.target.value))}>
                {micros.map((n) => (
                  <option key={n} value={n}>
                    {t('compareMicroWeek', { n })}
                  </option>
                ))}
              </select>
            ))}
          </div>
          <CompareChart series={microSeriesList} xLabel={(x) => `${t('compareSetN')} ${x}`} format={(v) => `${formatWeight(v, unit, lang)} ${unit}`} />
        </div>
      )}
    </div>
  );
}
