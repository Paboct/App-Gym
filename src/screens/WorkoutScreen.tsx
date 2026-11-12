import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowDown, ArrowLeft, ArrowUp, Check, ChevronDown, Info, NotebookPen, Plus, Repeat, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ExerciseDetail, ExercisePicker } from '../components/ExercisePicker';
import { RestBar } from '../components/RestBar';
import { Sheet } from '../components/Sheet';
import { Stepper } from '../components/Stepper';
import { db } from '../data/db';
import {
  addSet,
  addWorkoutExercise,
  bestE1rmBefore,
  discardWorkout,
  finishWorkout,
  moveWorkoutExercise,
  previousSets,
  removeSet,
  saveSet,
  setWorkoutExerciseNotes,
  substituteWorkoutExercise,
  type SubstituteScope,
} from '../data/repo';
import { syncNow } from '../data/sync';
import { e1rm, formatDuration, formatE1rm, formatWeight, isNewPr, kgToUnit, roundForDisplay, setE1rm, suggestNext, unitToKg } from '../domain/calc';
import type { DropSet, Exercise, Rir, SetLog, Unit, Workout, WorkoutExercise } from '../domain/types';
import { clearRest, startRest, useNow } from '../lib/restTimer';
import { exerciseName, useSettings, useT, type Translate } from '../lib/settings';
import { RirPicker } from './DayScreen';

function sortSets(sets: SetLog[]): SetLog[] {
  return [...sets].sort((a, b) => a.index - b.index);
}

/** "Aproximación 1", "Serie 2"… numerando por separado cada tipo. */
function setLabel(set: SetLog, all: SetLog[], t: Translate): string {
  const sameKind = all.filter((s) => s.kind === set.kind);
  const n = sameKind.findIndex((s) => s.id === set.id) + 1;
  return set.kind === 'warmup' ? t('warmupN', { n }) : t('setN', { n });
}

export function WorkoutScreen() {
  const t = useT();
  const { lang, unit } = useSettings();
  const navigate = useNavigate();
  const { workoutId = '' } = useParams();
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const now = useNow(1000);

  const data = useLiveQuery(async () => {
    const workout = await db.workouts.get(workoutId);
    if (!workout) return null;
    const [day, wes, sets] = await Promise.all([
      db.days.get(workout.dayId),
      db.workoutExercises.where('workoutId').equals(workoutId).sortBy('order'),
      db.sets.where('workoutId').equals(workoutId).toArray(),
    ]);
    const list = await db.exercises.bulkGet([...new Set(wes.map((w) => w.exerciseId))]);
    const exercises = new Map(list.filter((e): e is Exercise => !!e).map((e) => [e.id, e]));
    return { workout, day, wes, sets, exercises };
  }, [workoutId]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const firstPending = useMemo(() => {
    if (!data) return null;
    return data.wes.find((we) => data.sets.some((s) => s.workoutExerciseId === we.id && !s.done))?.id ?? null;
  }, [data]);

  // Al entrar se abre el primer ejercicio con series pendientes.
  useEffect(() => {
    if (openId === null && firstPending) setOpenId(firstPending);
  }, [openId, firstPending]);

  if (data === undefined) return <div className="screen no-tabs" />;
  if (data === null) return <Navigate to="/" replace />;
  const { workout, day, wes, sets, exercises } = data;
  if (workout.status === 'done') return <Navigate to={`/summary/${workout.id}`} replace />;

  const doneCount = sets.filter((s) => s.done).length;
  const pendingCount = sets.length - doneCount;
  const elapsed = Math.max(0, Math.round((now - workout.startedAt) / 1000));

  const goNextExercise = (currentId: string) => {
    const index = wes.findIndex((w) => w.id === currentId);
    const order = [...wes.slice(index + 1), ...wes.slice(0, index)];
    const next = order.find((we) => sets.some((s) => s.workoutExerciseId === we.id && !s.done && s.workoutExerciseId !== currentId));
    setOpenId(next?.id ?? currentId);
  };

  const finish = async () => {
    clearRest();
    await finishWorkout(workout.id);
    void syncNow(); // guarda el entreno en la nube si hay sesión (no bloquea)
    navigate(`/summary/${workout.id}?fresh=1`, { replace: true });
  };

  return (
    <div className="screen no-tabs" style={{ paddingBottom: 140 }}>
      <div className="workout-head">
        <div className="row">
          <button className="icon-btn" onClick={() => navigate('/')} aria-label={t('back')}>
            <ArrowLeft />
          </button>
          <div className="grow">
            <p className="eyebrow">
              {t('weekN', { n: workout.micro })}
              {workout.backfilled ? ` · ${workout.date}` : ''}
            </p>
            <h2 className="truncate">{day?.name ?? t('workout')}</h2>
          </div>
          {!workout.backfilled && <span className="clock">{formatDuration(elapsed)}</span>}
          <button className="btn primary sm" onClick={() => setFinishing(true)}>
            <Check size={16} /> {t('finish')}
          </button>
        </div>
      </div>

      <div className="list">
        {wes.map((we, i) => (
          <ExerciseCard
            key={we.id}
            we={we}
            workout={workout}
            exercise={exercises.get(we.exerciseId)}
            sets={sortSets(sets.filter((s) => s.workoutExerciseId === we.id))}
            open={openId === we.id}
            onToggle={() => setOpenId(openId === we.id ? '' : we.id)}
            isFirst={i === 0}
            isLast={i === wes.length - 1}
            unit={unit}
            onExerciseDone={() => goNextExercise(we.id)}
            onPr={(value) => setToast(t('prToast', { kg: formatE1rm(value, unit, lang), unit }))}
          />
        ))}
      </div>

      <button className="btn ghost block" onClick={() => setAdding(true)}>
        <Plus size={18} /> {t('addExercise')}
      </button>
      <button className="btn danger block sm" onClick={() => setDiscarding(true)}>
        <Trash2 size={16} /> {t('discardWorkout')}
      </button>

      <RestBar />
      {toast && <div className="toast">{toast}</div>}

      {adding && (
        <ExercisePicker
          title={t('addExercise')}
          onClose={() => setAdding(false)}
          onPick={async (id) => {
            const weId = await addWorkoutExercise(workout.id, id);
            setAdding(false);
            setOpenId(weId);
          }}
        />
      )}

      {finishing && (
        <Sheet title={t('finishWorkoutTitle')} onClose={() => setFinishing(false)}>
          {doneCount === 0 ? (
            <p className="muted">{t('finishNoSets')}</p>
          ) : (
            <p className="muted">
              {t('finishSummary', { done: doneCount })}
              {pendingCount > 0 ? ` ${t('finishPending', { n: pendingCount })}` : ''}
            </p>
          )}
          <button className="btn primary lg block" disabled={doneCount === 0} onClick={finish}>
            {t('finishWorkout')}
          </button>
          <button className="btn ghost block" onClick={() => setFinishing(false)}>
            {t('keepTraining')}
          </button>
        </Sheet>
      )}

      {discarding && (
        <Sheet title={t('discardWorkout')} onClose={() => setDiscarding(false)}>
          <p className="muted">{t('discardConfirm')}</p>
          <div className="grid-2">
            <button className="btn ghost" onClick={() => setDiscarding(false)}>
              {t('cancel')}
            </button>
            <button
              className="btn danger"
              onClick={async () => {
                clearRest();
                await discardWorkout(workout.id);
                navigate('/', { replace: true });
              }}
            >
              {t('discard')}
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

interface CardProps {
  we: WorkoutExercise;
  workout: Workout;
  exercise: Exercise | undefined;
  sets: SetLog[];
  open: boolean;
  onToggle: () => void;
  isFirst: boolean;
  isLast: boolean;
  unit: Unit;
  onExerciseDone: () => void;
  onPr: (e1rmKg: number) => void;
}

function ExerciseCard({ we, workout, exercise, sets, open, onToggle, isFirst, isLast, unit, onExerciseDone, onPr }: CardProps) {
  const t = useT();
  const { lang } = useSettings();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(we.notes.length > 0);
  const [info, setInfo] = useState(false);
  const [substituting, setSubstituting] = useState(false);
  const [pendingSub, setPendingSub] = useState<string | null>(null);
  // Peso de la última serie efectiva guardada: punto de partida de la siguiente.
  const [carryKg, setCarryKg] = useState<number | null>(null);

  const previous = useLiveQuery(
    () => (open ? previousSets(we.exerciseId, workout) : Promise.resolve(null)),
    [open, we.exerciseId, workout.id],
  );
  const bestBefore = useLiveQuery(
    () => (open ? bestE1rmBefore(we.exerciseId, workout.id) : Promise.resolve(null)),
    [open, we.exerciseId, workout.id],
  );

  const workSets = sets.filter((s) => s.kind === 'work');
  const doneWork = workSets.filter((s) => s.done).length;
  const complete = sets.length > 0 && sets.every((s) => s.done);
  const selected = sets.find((s) => s.id === selectedId) ?? sets.find((s) => !s.done) ?? sets[sets.length - 1];

  const applySubstitution = async (scope: SubstituteScope) => {
    if (!pendingSub) return;
    await substituteWorkoutExercise(we.id, pendingSub, scope);
    setPendingSub(null);
    setSelectedId(null);
  };

  const onSaved = async (saved: SetLog, weightKg: number, reps: number) => {
    if (saved.kind === 'work') {
      setCarryKg(weightKg);
      const value = e1rm(weightKg, reps);
      const bestToday = Math.max(0, ...sets.filter((s) => s.id !== saved.id).map(setE1rm));
      if (isNewPr(value, bestBefore ?? null) && value > bestToday) onPr(value);
    }
    if (!workout.backfilled) startRest(we.restSec);
    const next = sets.find((s) => s.id !== saved.id && !s.done);
    if (next) setSelectedId(next.id);
    else {
      setSelectedId(null);
      onExerciseDone();
    }
  };

  return (
    <div className={`ex-card${open ? ' open' : ''}${complete ? ' complete' : ''}`}>
      <button className="ex-head" onClick={onToggle} aria-expanded={open}>
        <div className="grow">
          <h3 className="truncate">{exerciseName(exercise, lang)}</h3>
          <div className="row wrap" style={{ gap: 6, marginTop: 4 }}>
            <span className="small muted">
              {doneWork}/{workSets.length} · {we.repMin}–{we.repMax} {t('reps')}
            </span>
            {exercise?.unilateral && <span className="badge gold">{t('perSide')}</span>}
            {we.targetRir != null && <span className="badge">RIR {we.targetRir}</span>}
          </div>
          <div className="progress-dots">
            {sets.map((s) => (
              <i key={s.id} className={`${s.kind === 'warmup' ? 'warm' : ''}${s.done ? ' done' : ''}`} />
            ))}
          </div>
        </div>
        {complete ? <Check className="faint" /> : <ChevronDown className="faint" style={{ transform: open ? 'rotate(180deg)' : undefined }} />}
      </button>

      {open && (
        <div className="ex-body">
          <div className="row" style={{ gap: 2 }}>
            <button className="btn sm ghost" onClick={() => setSubstituting(true)}>
              <Repeat size={15} /> {t('substitute')}
            </button>
            <span className="grow" />
            <button className={`icon-btn${showNotes ? ' on' : ''}`} onClick={() => setShowNotes(!showNotes)} aria-label={t('notes')}>
              <NotebookPen />
            </button>
            {exercise && (
              <button className="icon-btn" onClick={() => setInfo(true)} aria-label={t('details')}>
                <Info />
              </button>
            )}
            <button className="icon-btn" disabled={isFirst} onClick={() => moveWorkoutExercise(we.id, -1)} aria-label={t('moveUp')}>
              <ArrowUp />
            </button>
            <button className="icon-btn" disabled={isLast} onClick={() => moveWorkoutExercise(we.id, 1)} aria-label={t('moveDown')}>
              <ArrowDown />
            </button>
          </div>

          {showNotes && (
            <textarea
              className="input"
              defaultValue={we.notes}
              placeholder={t('notesPlaceholder')}
              onBlur={(e) => setWorkoutExerciseNotes(we.id, e.target.value.trim())}
            />
          )}

          {selected && (
            <>
              <label className="field">
                <span>{t('setSelector')}</span>
                <select className="input" value={selected.id} onChange={(e) => setSelectedId(e.target.value)}>
                  {sets.map((s) => (
                    <option key={s.id} value={s.id}>
                      {setLabel(s, sets, t)}
                      {s.done ? ' ✓' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <SetEditor
                key={selected.id}
                set={selected}
                sets={sets}
                we={we}
                exercise={exercise}
                unit={unit}
                previous={previous?.sets ?? null}
                previousMicro={previous?.workout.micro ?? null}
                carryKg={carryKg}
                onSaved={onSaved}
                onRemoved={() => setSelectedId(null)}
              />
            </>
          )}

          <div className="grid-2">
            <button className="btn sm" onClick={async () => setSelectedId(await addSet(we.id, 'work'))}>
              <Plus size={15} /> {t('addSet')}
            </button>
            <button className="btn sm ghost" onClick={async () => setSelectedId(await addSet(we.id, 'warmup'))}>
              <Plus size={15} /> {t('addWarmup')}
            </button>
          </div>

          {sets.some((s) => s.done) && (
            <table className="set-table">
              <thead>
                <tr>
                  <th>{t('set')}</th>
                  <th>{unit}</th>
                  <th>{t('reps')}</th>
                  <th>RIR</th>
                </tr>
              </thead>
              <tbody>
                {sets
                  .filter((s) => s.done)
                  .map((s) => (
                    <tr key={s.id} className={s.kind === 'warmup' ? 'warm' : ''} onClick={() => setSelectedId(s.id)} style={{ cursor: 'pointer' }}>
                      <td>{setLabel(s, sets, t)}</td>
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
          )}
        </div>
      )}

      {info && exercise && <ExerciseDetail exercise={exercise} onClose={() => setInfo(false)} />}

      {substituting && (
        <ExercisePicker
          title={t('substituteExercise')}
          onClose={() => setSubstituting(false)}
          onPick={(id) => {
            setSubstituting(false);
            if (id !== we.exerciseId) setPendingSub(id);
          }}
        />
      )}

      {pendingSub && (
        <Sheet title={t('substituteScopeTitle')} onClose={() => setPendingSub(null)}>
          <p className="small muted">{t('substituteScopeText', { n: workout.micro })}</p>
          {sets.some((s) => s.done) && <p className="notice">{t('substituteClearsSets')}</p>}
          <button className="btn block" onClick={() => applySubstitution('week')}>
            {t('onlyThisWeek', { n: workout.micro })}
          </button>
          {we.plannedExerciseId && (
            <button className="btn primary block" onClick={() => applySubstitution('rest')}>
              {t('restOfWeeks')}
            </button>
          )}
        </Sheet>
      )}
    </div>
  );
}

interface EditorProps {
  set: SetLog;
  sets: SetLog[];
  we: WorkoutExercise;
  exercise: Exercise | undefined;
  unit: Unit;
  previous: SetLog[] | null;
  previousMicro: number | null;
  carryKg: number | null;
  onSaved: (set: SetLog, weightKg: number, reps: number) => void;
  onRemoved: () => void;
}

interface DropDraft {
  weight: number | null;
  reps: number | null;
}

function SetEditor({ set, sets, we, exercise, unit, previous, previousMicro, carryKg, onSaved, onRemoved }: EditorProps) {
  const t = useT();
  const { lang } = useSettings();
  const isWork = set.kind === 'work';
  const workIndex = sets.filter((s) => s.kind === 'work').findIndex((s) => s.id === set.id);
  const reference = isWork && previous ? (previous[workIndex] ?? previous[previous.length - 1] ?? null) : null;
  const toDisplay = (kg: number) => roundForDisplay(kgToUnit(kg, unit), unit);

  // Peso de partida: el ya guardado; si no, el de la serie anterior de hoy; si no, el de la semana pasada.
  const initialWeight = (): number | null => {
    if (set.weight != null) return toDisplay(set.weight);
    if (isWork && carryKg != null) return toDisplay(carryKg);
    const earlier = [...sets].filter((s) => s.done && s.kind === set.kind && s.index < set.index).pop();
    if (earlier?.weight != null) return toDisplay(earlier.weight);
    if (reference?.weight != null) return toDisplay(reference.weight);
    return exercise?.equipment === 'bodyweight' ? 0 : null;
  };

  const [weight, setWeight] = useState<number | null>(initialWeight);
  const [reps, setReps] = useState<number | null>(set.reps);
  const [rir, setRir] = useState<Rir | null>(set.rir ?? (isWork ? we.targetRir : null));
  const [dropOn, setDropOn] = useState(set.drops.length > 0);
  const [drops, setDrops] = useState<DropDraft[]>(
    set.drops.length > 0 ? set.drops.map((d) => ({ weight: toDisplay(d.weight), reps: d.reps })) : [{ weight: null, reps: null }],
  );

  const step = unit === 'lb' ? 5 : exercise?.equipment === 'dumbbell' ? 2 : 2.5;
  const valid = weight != null && reps != null && reps > 0;
  const suggestion = reference ? suggestNext(reference, we.repMin, we.repMax, unit === 'lb' ? unitToKg(5, 'lb') : step) : null;

  const weightHint =
    exercise?.equipment === 'dumbbell' ? t('perDumbbell') : exercise?.equipment === 'bodyweight' ? t('addedWeightOnly') : null;

  const save = async () => {
    if (!valid) return;
    const weightKg = unitToKg(weight, unit);
    const cleanDrops: DropSet[] =
      isWork && dropOn
        ? drops
            .filter((d) => d.weight != null && d.reps != null && d.reps > 0)
            .map((d) => ({ weight: unitToKg(d.weight as number, unit), reps: d.reps as number }))
        : [];
    await saveSet(set.id, { weight: weightKg, reps, rir: isWork ? rir : null, drops: cleanDrops, done: true });
    onSaved(set, weightKg, reps);
  };

  return (
    <div className="col" style={{ gap: 12 }}>
      {reference && reference.weight != null && (
        <p className="reference">
          {previousMicro != null ? t('lastWeekRef', { n: previousMicro }) : t('lastTimeRef')}:{' '}
          <b>
            {formatWeight(reference.weight, unit, lang)} {unit} × {reference.reps}
          </b>
          {reference.rir != null ? ` · RIR ${reference.rir}` : ''}
          {reference.drops.length > 0 ? ` · ${t('dropset').toLowerCase()}` : ''}
          {suggestion && (
            <>
              <br />
              {t('suggestion')}:{' '}
              <b>
                {formatWeight(suggestion.weight, unit, lang)} {unit} ×{' '}
                {suggestion.repMin < suggestion.repMax ? `${suggestion.repMin}–${suggestion.repMax}` : suggestion.repMax}
              </b>
            </>
          )}
        </p>
      )}

      <div className="grid-2">
        <div className="field">
          <span>
            {t('weight')} ({unit}){weightHint ? ` · ${weightHint}` : ''}
          </span>
          <Stepper value={weight} onChange={setWeight} step={step} decimals ariaLabel={t('weight')} />
        </div>
        <div className="field">
          <span>
            {t('repsLong')}
            {exercise?.unilateral ? ` · ${t('perSide')}` : ''}
          </span>
          <Stepper value={reps} onChange={setReps} min={0} max={200} ariaLabel={t('repsLong')} />
        </div>
      </div>

      {isWork && (
        <>
          <div className="field">
            <span>{t('rirLong')}</span>
            <RirPicker value={rir} onChange={setRir} />
          </div>

          <label className="switch">
            <span>
              <strong>{t('dropset')}</strong>
            </span>
            <input type="checkbox" checked={dropOn} onChange={(e) => setDropOn(e.target.checked)} />
          </label>

          {dropOn && (
            <div className="col" style={{ gap: 8 }}>
              {drops.map((d, i) => (
                <div className="drop-row" key={i}>
                  <span className="num faint">↓{i + 1}</span>
                  <Stepper
                    value={d.weight}
                    onChange={(v) => setDrops(drops.map((x, j) => (j === i ? { ...x, weight: v } : x)))}
                    step={step}
                    decimals
                    bare
                    placeholder={unit}
                    ariaLabel={`${t('dropset')} ${i + 1} ${t('weight')}`}
                  />
                  <Stepper
                    value={d.reps}
                    onChange={(v) => setDrops(drops.map((x, j) => (j === i ? { ...x, reps: v } : x)))}
                    bare
                    placeholder={t('reps')}
                    ariaLabel={`${t('dropset')} ${i + 1} ${t('reps')}`}
                  />
                  <button
                    className="icon-btn"
                    onClick={() => (drops.length > 1 ? setDrops(drops.filter((_, j) => j !== i)) : setDropOn(false))}
                    aria-label={t('delete')}
                  >
                    <Trash2 />
                  </button>
                </div>
              ))}
              {drops.length < 3 && (
                <button className="btn sm ghost" onClick={() => setDrops([...drops, { weight: null, reps: null }])}>
                  <Plus size={15} /> {t('addDrop')}
                </button>
              )}
              <p className="notice">{t('dropsetNotice')}</p>
            </div>
          )}
        </>
      )}

      {!isWork && <p className="notice">{t('warmupNotice')}</p>}

      <div className="row">
        <button className="btn primary grow lg" disabled={!valid} onClick={save}>
          <Check size={20} /> {set.done ? t('updateSet') : t('saveSet')}
        </button>
        <button
          className="icon-btn"
          style={{ height: 54, width: 48 }}
          onClick={async () => {
            await removeSet(set.id);
            onRemoved();
          }}
          aria-label={t('deleteSet')}
        >
          <Trash2 />
        </button>
      </div>
    </div>
  );
}
