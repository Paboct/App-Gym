import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowDown, ArrowLeft, ArrowUp, Info, Pencil, Play, Plus, Repeat, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ExerciseDetail, ExercisePicker } from '../components/ExercisePicker';
import { MuscleSummary } from '../components/MuscleSummary';
import { Sheet } from '../components/Sheet';
import { Stepper } from '../components/Stepper';
import { db } from '../data/db';
import {
  addPlanned,
  movePlanned,
  removeDay,
  removePlanned,
  renameDay,
  startWorkout,
  substitutePlanned,
  updatePlanned,
  type SubstituteScope,
} from '../data/repo';
import { effectivePlan, formatDuration, todayIso } from '../domain/calc';
import type { Exercise, Mesocycle, PlannedExercise, Rir } from '../domain/types';
import { muscleLevels } from '../lib/muscles';
import { exerciseName, useSettings, useT } from '../lib/settings';

const REST_OPTIONS = [60, 90, 120, 150, 180, 240];

export function DayScreen() {
  const t = useT();
  const { lang } = useSettings();
  const navigate = useNavigate();
  const { dayId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const micro = Math.max(1, Number(params.get('micro')) || 1);

  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState<PlannedExercise | null>(null);
  const [info, setInfo] = useState<Exercise | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [pastDate, setPastDate] = useState<string | null>(null);

  const data = useLiveQuery(async () => {
    const day = await db.days.get(dayId);
    if (!day) return null;
    const meso = await db.mesocycles.get(day.mesocycleId);
    if (!meso) return null;
    const planned = await db.planned.where('dayId').equals(dayId).sortBy('order');
    const days = await db.days.where('mesocycleId').equals(meso.id).sortBy('order');
    const workouts = await db.workouts.where('dayId').equals(dayId).toArray();
    const inProgress = (await db.workouts.where('status').equals('in_progress').first()) ?? null;
    const ids = new Set<string>();
    for (const p of planned) {
      ids.add(p.exerciseId);
      Object.values(p.exerciseByMicro).forEach((id) => ids.add(id));
    }
    const list = await db.exercises.bulkGet([...ids]);
    const exercises = new Map(list.filter((e): e is Exercise => !!e).map((e) => [e.id, e]));
    return { day, meso, planned, workouts, inProgress, exercises, index: days.findIndex((d) => d.id === dayId) + 1 };
  }, [dayId]);

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

  const { day, meso, planned, workouts, inProgress, exercises } = data;
  const microClamped = Math.min(micro, meso.microcycles);
  const isDeload = meso.deloadMicro === microClamped;
  const plans = planned.map((p) => ({ pe: p, plan: effectivePlan(p, meso, microClamped) }));
  const levels = muscleLevels(plans.map(({ plan }) => exercises.get(plan.exerciseId)));
  const doneWorkout = workouts.find((w) => w.micro === microClamped && w.status === 'done');
  const active = meso.status === 'active';

  const begin = async (date?: string) => {
    const id = await startWorkout(meso.id, day.id, microClamped, date ? { date } : {});
    navigate(`/workout/${id}`);
  };

  return (
    <div className="screen">
      <div className="topbar">
        <button className="icon-btn" onClick={() => navigate('/')} aria-label={t('back')}>
          <ArrowLeft />
        </button>
        <div className="grow">
          <p className="eyebrow">
            {t('dayN', { n: data.index })} · {meso.name}
          </p>
          <h1 className="truncate">{day.name}</h1>
        </div>
        <button className="icon-btn" onClick={() => setRenaming(true)} aria-label={t('edit')}>
          <Pencil />
        </button>
      </div>

      <div className="chips">
        {Array.from({ length: meso.microcycles }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            className={`chip${n === microClamped ? ' active' : ''}`}
            onClick={() => setParams({ micro: String(n) }, { replace: true })}
          >
            {t('weekShort', { n })}
            {meso.deloadMicro === n ? ` · ${t('deload')}` : ''}
          </button>
        ))}
      </div>

      {planned.length > 0 && (
        <div className="card">
          <MuscleSummary levels={levels} />
        </div>
      )}

      <div className="section-title">
        <h2>{t('exercises')}</h2>
        {isDeload && <span className="badge gold">{t('deloadWeek')}</span>}
      </div>

      {planned.length === 0 && (
        <div className="empty">
          <span className="emoji">📋</span>
          <p>{t('dayEmpty')}</p>
        </div>
      )}

      <div className="list">
        {plans.map(({ pe, plan }, i) => {
          const ex = exercises.get(plan.exerciseId);
          return (
            <div key={pe.id} className="card" style={{ padding: 12 }}>
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <span className="num faint" style={{ width: 22, fontSize: '1.2rem' }}>
                  {i + 1}
                </span>
                <button
                  className="grow"
                  style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer' }}
                  onClick={() => setEditing(pe)}
                >
                  <strong>{exerciseName(ex, lang)}</strong>
                  <div className="row wrap" style={{ gap: 6, marginTop: 4 }}>
                    <span className="num" style={{ fontSize: '1.05rem' }}>
                      {plan.sets} × {pe.repMin}–{pe.repMax}
                    </span>
                    {ex?.unilateral && <span className="badge gold">{t('perSide')}</span>}
                    {plan.targetRir != null && <span className="badge">RIR {plan.targetRir}</span>}
                    <span className="badge">⏱ {formatDuration(pe.restSec)}</span>
                    {plan.substituted && <span className="badge red">{t('substituted')}</span>}
                  </div>
                  {pe.notes && <p className="tiny faint" style={{ marginTop: 4 }}>{pe.notes}</p>}
                </button>
                <div className="row" style={{ gap: 0 }}>
                  {ex && (
                    <button className="icon-btn" onClick={() => setInfo(ex)} aria-label={t('details')}>
                      <Info />
                    </button>
                  )}
                  <button className="icon-btn" onClick={() => movePlanned(pe.id, -1)} disabled={i === 0} aria-label={t('moveUp')}>
                    <ArrowUp />
                  </button>
                  <button
                    className="icon-btn"
                    onClick={() => movePlanned(pe.id, 1)}
                    disabled={i === plans.length - 1}
                    aria-label={t('moveDown')}
                  >
                    <ArrowDown />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        <button className="btn ghost" onClick={() => setPicking(true)}>
          <Plus size={18} /> {t('addExercise')}
        </button>
      </div>

      {doneWorkout ? (
        <Link className="btn gold block" to={`/summary/${doneWorkout.id}`}>
          {t('viewWorkoutDone', { n: microClamped })}
        </Link>
      ) : inProgress ? (
        <Link className="btn primary lg block" to={`/workout/${inProgress.id}`}>
          <Play size={20} /> {t('continueWorkout')}
        </Link>
      ) : (
        active &&
        planned.length > 0 && (
          <div className="col">
            <button className="btn primary lg block" onClick={() => begin()}>
              <Play size={20} /> {t('startWorkout')}
            </button>
            <button className="btn ghost block sm" onClick={() => setPastDate(todayIso())}>
              {t('logPastWorkout')}
            </button>
          </div>
        )
      )}

      {picking && (
        <ExercisePicker
          title={t('addExercise')}
          onClose={() => setPicking(false)}
          onPick={async (id) => {
            await addPlanned(day.id, id);
            setPicking(false);
          }}
        />
      )}

      {info && <ExerciseDetail exercise={info} onClose={() => setInfo(null)} />}

      {editing && (
        <PlannedEditor
          key={editing.id}
          pe={editing}
          meso={meso}
          micro={microClamped}
          exercise={exercises.get(effectivePlan(editing, meso, microClamped).exerciseId)}
          onClose={() => setEditing(null)}
        />
      )}

      {renaming && (
        <RenameDay
          name={day.name}
          canDelete={workouts.length === 0}
          onClose={() => setRenaming(false)}
          onSave={async (name) => {
            await renameDay(day.id, name);
            setRenaming(false);
          }}
          onDelete={async () => {
            await removeDay(day.id);
            navigate('/', { replace: true });
          }}
        />
      )}

      {pastDate != null && (
        <Sheet title={t('logPastWorkout')} onClose={() => setPastDate(null)}>
          <p className="small muted">{t('logPastHint')}</p>
          <label className="field">
            <span>{t('date')}</span>
            <input className="input" type="date" max={todayIso()} value={pastDate} onChange={(e) => setPastDate(e.target.value)} />
          </label>
          <button className="btn primary block" disabled={!pastDate} onClick={() => begin(pastDate)}>
            {t('startLogging')}
          </button>
        </Sheet>
      )}
    </div>
  );
}

interface RenameProps {
  name: string;
  canDelete: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  onDelete: () => void;
}

function RenameDay({ name, canDelete, onClose, onSave, onDelete }: RenameProps) {
  const t = useT();
  const [value, setValue] = useState(name);
  const [confirm, setConfirm] = useState(false);
  return (
    <Sheet title={t('editDay')} onClose={onClose}>
      <label className="field">
        <span>{t('name')}</span>
        <input className="input" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
      </label>
      <button className="btn primary block" disabled={!value.trim()} onClick={() => onSave(value)}>
        {t('save')}
      </button>
      <hr className="divider" />
      {!canDelete ? (
        <p className="tiny faint center">{t('dayHasWorkouts')}</p>
      ) : confirm ? (
        <div className="grid-2">
          <button className="btn ghost" onClick={() => setConfirm(false)}>
            {t('cancel')}
          </button>
          <button className="btn danger" onClick={onDelete}>
            {t('deleteDay')}
          </button>
        </div>
      ) : (
        <button className="btn danger block" onClick={() => setConfirm(true)}>
          <Trash2 size={16} /> {t('deleteDay')}
        </button>
      )}
    </Sheet>
  );
}

interface EditorProps {
  pe: PlannedExercise;
  meso: Mesocycle;
  micro: number;
  exercise: Exercise | undefined;
  onClose: () => void;
}

/** Configuración de un ejercicio del plan: base del mesociclo y variación de la semana seleccionada. */
function PlannedEditor({ pe, meso, micro, exercise, onClose }: EditorProps) {
  const t = useT();
  const { lang } = useSettings();
  const [sets, setSets] = useState<number | null>(pe.sets);
  const [repMin, setRepMin] = useState<number | null>(pe.repMin);
  const [repMax, setRepMax] = useState<number | null>(pe.repMax);
  const [rir, setRir] = useState<Rir | null>(pe.targetRir);
  const [rest, setRest] = useState(pe.restSec);
  const [notes, setNotes] = useState(pe.notes);
  const hasOverride = pe.setsByMicro[micro] != null || pe.rirByMicro[micro] != null;
  const [vary, setVary] = useState(hasOverride);
  const plan = effectivePlan(pe, meso, micro);
  const [weekSets, setWeekSets] = useState<number | null>(plan.sets);
  const [weekRir, setWeekRir] = useState<Rir | null>(plan.targetRir);
  const [substituting, setSubstituting] = useState(false);
  const [pendingSub, setPendingSub] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = async () => {
    const min = Math.max(1, repMin ?? pe.repMin);
    const max = Math.max(min, repMax ?? pe.repMax);
    const setsByMicro = { ...pe.setsByMicro };
    const rirByMicro = { ...pe.rirByMicro };
    delete setsByMicro[micro];
    delete rirByMicro[micro];
    if (vary) {
      if (weekSets != null) setsByMicro[micro] = Math.max(1, weekSets);
      if (weekRir != null) rirByMicro[micro] = weekRir;
    }
    await updatePlanned(pe.id, {
      sets: Math.max(1, sets ?? pe.sets),
      repMin: min,
      repMax: max,
      targetRir: rir,
      restSec: rest,
      notes: notes.trim(),
      setsByMicro,
      rirByMicro,
    });
    onClose();
  };

  const applySubstitution = async (scope: SubstituteScope) => {
    if (!pendingSub) return;
    await substitutePlanned(pe.id, pendingSub, micro, scope);
    onClose();
  };

  if (substituting) {
    return (
      <ExercisePicker
        title={t('substituteExercise')}
        onClose={() => setSubstituting(false)}
        onPick={(id) => {
          setPendingSub(id);
          setSubstituting(false);
        }}
      />
    );
  }

  if (pendingSub) {
    return (
      <Sheet title={t('substituteScopeTitle')} onClose={() => setPendingSub(null)}>
        <p className="small muted">{t('substituteScopeText', { n: micro })}</p>
        <button className="btn block" onClick={() => applySubstitution('week')}>
          {t('onlyThisWeek', { n: micro })}
        </button>
        <button className="btn primary block" onClick={() => applySubstitution('rest')}>
          {t('restOfWeeks')}
        </button>
      </Sheet>
    );
  }

  return (
    <Sheet title={exerciseName(exercise, lang)} onClose={onClose} full>
      <div className="grid-3">
        <div className="field">
          <span>{t('sets')}</span>
          <Stepper value={sets} onChange={setSets} min={1} max={12} />
        </div>
        <div className="field">
          <span>{t('repsMin')}</span>
          <Stepper value={repMin} onChange={setRepMin} min={1} max={50} />
        </div>
        <div className="field">
          <span>{t('repsMax')}</span>
          <Stepper value={repMax} onChange={setRepMax} min={1} max={50} />
        </div>
      </div>
      {exercise?.unilateral && <p className="notice">{t('unilateralNotice')}</p>}

      <div className="field">
        <span>{t('targetRir')}</span>
        <RirPicker value={rir} onChange={setRir} allowNone />
        <p className="tiny faint">{t('rirScaleHint')}</p>
      </div>

      <div className="field">
        <span>{t('rest')}</span>
        <div className="chips wrap">
          {REST_OPTIONS.map((s) => (
            <button key={s} type="button" className={`chip${rest === s ? ' active' : ''}`} onClick={() => setRest(s)}>
              {formatDuration(s)}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span>{t('notes')}</span>
        <textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('notesPlaceholder')} />
      </label>

      <div className="card col" style={{ background: 'var(--surface-2)' }}>
        <label className="switch">
          <span>
            <strong>{t('varyThisWeek', { n: micro })}</strong>
            <br />
            <span className="tiny faint">{meso.deloadMicro === micro ? t('deloadDefaultHint') : t('varyHint')}</span>
          </span>
          <input type="checkbox" checked={vary} onChange={(e) => setVary(e.target.checked)} />
        </label>
        {vary && (
          <>
            <div className="field">
              <span>{t('setsThisWeek')}</span>
              <Stepper value={weekSets} onChange={setWeekSets} min={1} max={12} />
            </div>
            <div className="field">
              <span>{t('rirThisWeek')}</span>
              <RirPicker value={weekRir} onChange={setWeekRir} allowNone />
            </div>
          </>
        )}
      </div>

      <button className="btn primary block" onClick={save}>
        {t('save')}
      </button>

      <div className="grid-2">
        <button className="btn ghost" onClick={() => setSubstituting(true)}>
          <Repeat size={16} /> {t('substitute')}
        </button>
        {confirmDelete ? (
          <button
            className="btn danger"
            onClick={async () => {
              await removePlanned(pe.id);
              onClose();
            }}
          >
            {t('confirmDelete')}
          </button>
        ) : (
          <button className="btn danger" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={16} /> {t('removeFromPlan')}
          </button>
        )}
      </div>
    </Sheet>
  );
}

interface RirProps {
  value: Rir | null;
  onChange: (value: Rir | null) => void;
  allowNone?: boolean;
}

export function RirPicker({ value, onChange, allowNone }: RirProps) {
  return (
    <div className="segmented rir">
      {allowNone && (
        <button type="button" className={value == null ? 'active' : ''} onClick={() => onChange(null)}>
          –
        </button>
      )}
      {([8, 9, 10] as Rir[]).map((r) => (
        <button key={r} type="button" className={value === r ? 'active' : ''} onClick={() => onChange(r)}>
          {r}
        </button>
      ))}
    </div>
  );
}
