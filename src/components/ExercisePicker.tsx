import { useLiveQuery } from 'dexie-react-hooks';
import { Info, Plus, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { db } from '../data/db';
import { createCustomExercise, toggleFavorite } from '../data/repo';
import {
  EQUIPMENT,
  EQUIPMENT_NAMES,
  GROUPS,
  GROUP_NAMES,
  MUSCLES,
  MUSCLE_GROUP,
  MUSCLE_NAMES,
  type EquipmentId,
  type GroupId,
  type MuscleId,
} from '../domain/muscles';
import type { Exercise } from '../domain/types';
import { muscleLevels } from '../lib/muscles';
import { exerciseName, muscleNames, useSettings, useT } from '../lib/settings';
import { MuscleSummary } from './MuscleSummary';
import { Sheet } from './Sheet';

interface PickerProps {
  title: string;
  onPick: (exerciseId: string) => void;
  onClose: () => void;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Buscador del catálogo: por nombre, grupo muscular o favoritos; permite crear ejercicios propios. */
export function ExercisePicker({ title, onPick, onClose }: PickerProps) {
  const t = useT();
  const { lang } = useSettings();
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const favorites = useLiveQuery(() => db.favorites.toArray(), []);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<GroupId | 'all' | 'fav'>('all');
  const [detail, setDetail] = useState<Exercise | null>(null);
  const [creating, setCreating] = useState(false);

  const favSet = useMemo(() => new Set((favorites ?? []).map((f) => f.exerciseId)), [favorites]);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    return (exercises ?? [])
      .filter((e) => (filter === 'all' ? true : filter === 'fav' ? favSet.has(e.id) : e.group === filter))
      .filter((e) => !q || normalize(e.nameEs).includes(q) || normalize(e.nameEn).includes(q))
      .sort((a, b) => {
        const fav = Number(favSet.has(b.id)) - Number(favSet.has(a.id));
        return fav !== 0 ? fav : exerciseName(a, lang).localeCompare(exerciseName(b, lang), lang);
      });
  }, [exercises, favSet, filter, query, lang]);

  if (creating) {
    return (
      <CustomExerciseForm
        initialName={query}
        onClose={() => setCreating(false)}
        onCreated={(id) => {
          setCreating(false);
          onPick(id);
        }}
      />
    );
  }

  if (detail) {
    return (
      <ExerciseDetail
        exercise={detail}
        onClose={() => setDetail(null)}
        action={{ label: t('add'), run: () => onPick(detail.id) }}
      />
    );
  }

  return (
    <Sheet title={title} onClose={onClose} full>
      <input
        className="input"
        placeholder={t('searchExercise')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />
      <div className="chips">
        <button className={`chip${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>
          {t('all')}
        </button>
        <button className={`chip gold${filter === 'fav' ? ' active' : ''}`} onClick={() => setFilter('fav')}>
          <Star size={14} /> {t('favorites')}
        </button>
        {GROUPS.map((g) => (
          <button key={g} className={`chip${filter === g ? ' active' : ''}`} onClick={() => setFilter(g)}>
            {GROUP_NAMES[g][lang]}
          </button>
        ))}
      </div>
      <div className="list" style={{ gap: 6 }}>
        {results.map((e) => (
          <div key={e.id} className="row" style={{ gap: 4 }}>
            <button className="card tap grow" style={{ padding: '10px 12px' }} onClick={() => onPick(e.id)}>
              <div className="row between">
                <strong className="truncate">{exerciseName(e, lang)}</strong>
                {e.custom && <span className="badge gold">{t('custom')}</span>}
              </div>
              <div className="tiny faint truncate">
                {GROUP_NAMES[e.group][lang]} · {muscleNames(e.primary, lang)}
                {e.unilateral ? ` · ${t('unilateral')}` : ''}
              </div>
            </button>
            <button
              className={`icon-btn${favSet.has(e.id) ? ' on' : ''}`}
              onClick={() => toggleFavorite(e.id)}
              aria-label={t('favorites')}
            >
              <Star fill={favSet.has(e.id) ? 'currentColor' : 'none'} />
            </button>
            <button className="icon-btn" onClick={() => setDetail(e)} aria-label={t('details')}>
              <Info />
            </button>
          </div>
        ))}
        {results.length === 0 && <p className="muted center small">{t('noResults')}</p>}
      </div>
      <button className="btn gold block" onClick={() => setCreating(true)}>
        <Plus size={18} /> {t('createExercise')}
      </button>
    </Sheet>
  );
}

interface DetailProps {
  exercise: Exercise;
  onClose: () => void;
  action?: { label: string; run: () => void };
}

/** Ficha del ejercicio: zonas que trabaja resaltadas y lista de músculos. */
export function ExerciseDetail({ exercise, onClose, action }: DetailProps) {
  const t = useT();
  const { lang } = useSettings();
  return (
    <Sheet title={exerciseName(exercise, lang)} onClose={onClose}>
      <div className="row wrap">
        <span className="badge">{GROUP_NAMES[exercise.group][lang]}</span>
        <span className="badge">{EQUIPMENT_NAMES[exercise.equipment][lang]}</span>
        {exercise.unilateral && <span className="badge gold">{t('unilateral')}</span>}
        {exercise.custom && <span className="badge gold">{t('custom')}</span>}
      </div>
      <MuscleSummary levels={muscleLevels([exercise])} />
      {action && (
        <button className="btn primary block" onClick={action.run}>
          {action.label}
        </button>
      )}
    </Sheet>
  );
}

interface FormProps {
  initialName: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}

function CustomExerciseForm({ initialName, onClose, onCreated }: FormProps) {
  const t = useT();
  const { lang } = useSettings();
  const [name, setName] = useState(initialName);
  const [group, setGroup] = useState<GroupId>('chest');
  const [equipment, setEquipment] = useState<EquipmentId>('machine');
  const [unilateral, setUnilateral] = useState(false);
  const [levels, setLevels] = useState<Partial<Record<MuscleId, 'primary' | 'secondary'>>>({});

  // Un toque: principal · dos: secundario · tres: quitar.
  const cycle = (id: MuscleId) =>
    setLevels((prev) => {
      const next = { ...prev };
      if (!prev[id]) next[id] = 'primary';
      else if (prev[id] === 'primary') next[id] = 'secondary';
      else delete next[id];
      return next;
    });

  const primary = MUSCLES.filter((m) => levels[m] === 'primary');
  const secondary = MUSCLES.filter((m) => levels[m] === 'secondary');
  const valid = name.trim().length > 1 && primary.length > 0;
  const ordered = [...MUSCLES].sort((a, b) => Number(MUSCLE_GROUP[b] === group) - Number(MUSCLE_GROUP[a] === group));

  const submit = async () => {
    const id = await createCustomExercise({ nameEs: name, group, equipment, primary, secondary, unilateral });
    onCreated(id);
  };

  return (
    <Sheet title={t('createExercise')} onClose={onClose} full>
      <label className="field">
        <span>{t('name')}</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </label>
      <div className="grid-2">
        <label className="field">
          <span>{t('muscleGroup')}</span>
          <select className="input" value={group} onChange={(e) => setGroup(e.target.value as GroupId)}>
            {GROUPS.map((g) => (
              <option key={g} value={g}>
                {GROUP_NAMES[g][lang]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t('equipment')}</span>
          <select className="input" value={equipment} onChange={(e) => setEquipment(e.target.value as EquipmentId)}>
            {EQUIPMENT.map((q) => (
              <option key={q} value={q}>
                {EQUIPMENT_NAMES[q][lang]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="switch">
        <span>{t('unilateralLong')}</span>
        <input type="checkbox" checked={unilateral} onChange={(e) => setUnilateral(e.target.checked)} />
      </label>
      <div className="field">
        <span>{t('musclesWorked')}</span>
        <p className="tiny faint">{t('musclesHint')}</p>
        <div className="chips wrap">
          {ordered.map((m) => (
            <button
              key={m}
              type="button"
              className={`chip${levels[m] === 'primary' ? ' active' : ''}${levels[m] === 'secondary' ? ' gold active' : ''}`}
              onClick={() => cycle(m)}
            >
              {MUSCLE_NAMES[m][lang]}
            </button>
          ))}
        </div>
      </div>
      <MuscleSummary levels={levels} size="sm" />
      <p className="tiny faint center">{t('customImageHint')}</p>
      <button className="btn primary block" disabled={!valid} onClick={submit}>
        {t('createAndAdd')}
      </button>
    </Sheet>
  );
}
