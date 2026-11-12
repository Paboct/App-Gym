import { Check, ChevronRight, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sheet } from '../components/Sheet';
import { Stepper } from '../components/Stepper';
import { APP_NAME } from '../config';
import { addDay, finishMesocycle, updateMesocycle } from '../data/repo';
import { effectivePlan } from '../domain/calc';
import type { Mesocycle } from '../domain/types';
import { useT } from '../lib/settings';
import { useActiveMeso } from '../lib/useActiveMeso';

export function Brand() {
  return (
    <div className="brand">
      <img src="./icon.svg" alt="" />
      <span className="wordmark">{APP_NAME}</span>
    </div>
  );
}

export function RoutineScreen() {
  const t = useT();
  const navigate = useNavigate();
  const active = useActiveMeso();
  const [selected, setSelected] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);

  if (active === undefined) return <div className="screen" />;

  if (active === null) {
    return (
      <div className="screen">
        <Brand />
        <div className="empty">
          <span className="emoji">🏛️</span>
          <h2>{t('noMesocycleTitle')}</h2>
          <p>{t('noMesocycleText')}</p>
          <Link className="btn primary lg" to="/meso/new">
            <Plus size={20} /> {t('createMesocycle')}
          </Link>
        </div>
      </div>
    );
  }

  const { meso, days, planned, workouts, prs } = active;
  const micro = Math.min(selected ?? active.micro, meso.microcycles);
  const isDeload = meso.deloadMicro === micro;

  return (
    <div className="screen">
      <Brand />
      <div className="topbar">
        <div className="grow">
          <p className="eyebrow">{t('activeMesocycle')}</p>
          <h1 className="truncate">{meso.name}</h1>
        </div>
        <button className="icon-btn" onClick={() => setEditing(true)} aria-label={t('edit')}>
          <Pencil />
        </button>
      </div>

      {active.inProgress && (
        <Link className="card tap accent" to={`/workout/${active.inProgress.id}`}>
          <div className="row between">
            <div>
              <p className="eyebrow">{t('workoutInProgress')}</p>
              <strong>{days.find((d) => d.id === active.inProgress?.dayId)?.name}</strong>
            </div>
            <span className="btn primary sm">{t('continue')}</span>
          </div>
        </Link>
      )}

      <div className="chips" role="tablist" aria-label={t('microcycle')}>
        {Array.from({ length: meso.microcycles }, (_, i) => i + 1).map((n) => (
          <button key={n} className={`chip${n === micro ? ' active' : ''}`} onClick={() => setSelected(n)}>
            {t('weekShort', { n })}
            {meso.deloadMicro === n ? ` · ${t('deload')}` : ''}
            {n === active.micro && n !== micro && <i className="dot" />}
          </button>
        ))}
      </div>
      <p className="small muted">
        {t('microOfTotal', { n: micro, total: meso.microcycles })}
        {isDeload ? ` · ${t('deloadWeekInfo')}` : ''}
      </p>

      <div className="list">
        {days.map((day, i) => {
          const items = planned.filter((p) => p.dayId === day.id);
          const sets = items.reduce((acc, p) => acc + effectivePlan(p, meso, micro).sets, 0);
          const workout = workouts.find((w) => w.dayId === day.id && w.micro === micro && w.status === 'done');
          const trophies = workout ? prs.filter((p) => p.workoutId === workout.id).length : 0;
          const isNext = !workout && micro === active.micro && active.nextDay?.id === day.id;
          return (
            <Link key={day.id} className={`card tap${isNext ? ' accent' : ''}`} to={`/day/${day.id}?micro=${micro}`}>
              <div className="row between">
                <div className="grow">
                  <p className="eyebrow">{t('dayN', { n: i + 1 })}</p>
                  <h3 className="truncate">{day.name}</h3>
                  <p className="small muted">
                    {items.length === 0 ? t('noExercisesYet') : t('exercisesAndSets', { e: items.length, s: sets })}
                  </p>
                </div>
                {workout ? (
                  <span className="badge ok">
                    <Check size={12} /> {t('done')}
                    {trophies > 0 ? ` · 🏆${trophies > 1 ? ` ×${trophies}` : ''}` : ''}
                  </span>
                ) : isNext ? (
                  <span className="badge red">{t('next')}</span>
                ) : null}
                <ChevronRight className="faint" size={20} />
              </div>
            </Link>
          );
        })}
        <button
          className="btn ghost"
          onClick={async () => {
            const id = await addDay(meso.id, t('dayN', { n: days.length + 1 }));
            navigate(`/day/${id}?micro=${micro}`);
          }}
          disabled={days.length >= 7}
        >
          <Plus size={18} /> {t('addDay')}
        </button>
      </div>

      {editing && <MesocycleEditor meso={meso} onClose={() => setEditing(false)} />}
    </div>
  );
}

function MesocycleEditor({ meso, onClose }: { meso: Mesocycle; onClose: () => void }) {
  const t = useT();
  const navigate = useNavigate();
  const [name, setName] = useState(meso.name);
  const [microcycles, setMicrocycles] = useState<number | null>(meso.microcycles);
  const [deload, setDeload] = useState<number | null>(meso.deloadMicro);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const total = Math.max(1, microcycles ?? meso.microcycles);

  const save = async () => {
    await updateMesocycle(meso.id, {
      name: name.trim() || meso.name,
      microcycles: total,
      deloadMicro: deload != null && deload <= total ? deload : null,
    });
    onClose();
  };

  return (
    <Sheet title={t('editMesocycle')} onClose={onClose}>
      <label className="field">
        <span>{t('mesocycleName')}</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <div className="field">
        <span>{t('microcyclesCount')}</span>
        <Stepper value={microcycles} onChange={setMicrocycles} min={1} max={16} />
      </div>
      <label className="field">
        <span>{t('deloadWeek')}</span>
        <select className="input" value={deload ?? ''} onChange={(e) => setDeload(e.target.value ? Number(e.target.value) : null)}>
          <option value="">{t('none')}</option>
          {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {t('weekN', { n })}
            </option>
          ))}
        </select>
      </label>
      <button className="btn primary block" onClick={save}>
        {t('save')}
      </button>
      <hr className="divider" />
      {confirmFinish ? (
        <div className="col">
          <p className="small muted">{t('finishMesocycleConfirm')}</p>
          <div className="grid-2">
            <button className="btn ghost" onClick={() => setConfirmFinish(false)}>
              {t('cancel')}
            </button>
            <button
              className="btn danger"
              onClick={async () => {
                await finishMesocycle(meso.id);
                onClose();
                navigate(`/history/${meso.id}`);
              }}
            >
              {t('finishMesocycle')}
            </button>
          </div>
        </div>
      ) : (
        <button className="btn danger block" onClick={() => setConfirmFinish(true)}>
          {t('finishMesocycle')}
        </button>
      )}
    </Sheet>
  );
}
