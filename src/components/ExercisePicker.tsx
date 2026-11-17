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
  MUSCLE_SHORT_NAMES,
  type EquipmentId,
  type GroupId,
  type MuscleId,
} from '../domain/muscles';
import type { Exercise, MuscleActivation } from '../domain/types';
import { activationBand, muscleRows } from '../domain/exerciseMuscles';
import { muscleActivations } from '../lib/muscles';
import { exerciseName, muscleNames, useSettings, useT } from '../lib/settings';
import { ExerciseImage } from './ExerciseImage';
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
    // Busca por palabras sueltas: «press banca» encuentra «Press de banca».
    const tokens = normalize(query).split(/\s+/).filter(Boolean);
    const matches = (e: Exercise) => {
      const haystack = `${normalize(e.nameEs)} ${normalize(e.nameEn)}`;
      return tokens.every((token) => haystack.includes(token));
    };
    return (exercises ?? [])
      .filter((e) => (filter === 'all' ? true : filter === 'fav' ? favSet.has(e.id) : e.group === filter))
      .filter((e) => tokens.length === 0 || matches(e))
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
            <button className="card tap grow row" style={{ padding: '10px 12px', gap: 10 }} onClick={() => onPick(e.id)}>
              <ExerciseImage exercise={e} size="sm" />
              <div className="grow" style={{ minWidth: 0, textAlign: 'left' }}>
              <div className="row between">
                <strong className="truncate">{exerciseName(e, lang)}</strong>
                {e.custom && <span className="badge gold">{t('custom')}</span>}
              </div>
              <div className="tiny faint truncate">
                {GROUP_NAMES[e.group][lang]} ·{' '}
                {muscleNames(
                  e.muscles.filter((m) => m.role === 'principal').map((m) => m.id),
                  lang,
                )}
                {e.unilateral ? ` · ${t('unilateral')}` : ''}
              </div>
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

const MECH_KEY = { Compuesto: 'mechCompound', Aislamiento: 'mechIsolation', Isométrico: 'mechIsometric' } as const;
const ROLE_KEY = { principal: 'roleMain', secundario: 'roleSecondary', estabilizador: 'roleStabilizer' } as const;
const CONF_KEY = { alta: 'confidenceHigh', media: 'confidenceMid', baja: 'confidenceLow' } as const;

/** Ficha del ejercicio: descripción, patrón, mapa con tramos y lista de músculos con su % de activación. */
export function ExerciseDetail({ exercise, onClose, action }: DetailProps) {
  const t = useT();
  const { lang } = useSettings();
  const description = lang === 'es' ? exercise.descriptionEs : exercise.descriptionEn;
  const pattern = lang === 'es' ? exercise.patternEs : exercise.patternEn;
  return (
    <Sheet title={exerciseName(exercise, lang)} onClose={onClose}>
      <div className="row wrap">
        <span className="badge">{GROUP_NAMES[exercise.group][lang]}</span>
        <span className="badge">{EQUIPMENT_NAMES[exercise.equipment][lang]}</span>
        {pattern && <span className="badge">{pattern}</span>}
        {exercise.mechanics && <span className="badge">{t(MECH_KEY[exercise.mechanics])}</span>}
        {exercise.unilateral && <span className="badge gold">{t('unilateral')}</span>}
        {exercise.custom && <span className="badge gold">{t('custom')}</span>}
      </div>
      {description && <p className="small">{description}</p>}
      <ExerciseImage exercise={exercise} />
      <MuscleSummary activations={muscleActivations([exercise])} showList={false} />
      <ul className="list" style={{ gap: 4, margin: 0, padding: 0, listStyle: 'none' }}>
        {muscleRows(exercise).map((r) => (
          <li key={r.id} className="row between small">
            <span className="row" style={{ gap: 8 }}>
              <i
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  background: `var(--act-${activationBand(r.percent / 100)})`,
                }}
              />
              {MUSCLE_NAMES[r.id][lang]}
            </span>
            <span className="faint">
              {r.percent} % · {t(ROLE_KEY[r.role])}
            </span>
          </li>
        ))}
      </ul>
      {!exercise.custom && (
        <p className="tiny faint">
          {t('estimatedCoefs')}
          {exercise.confidence ? ` · ${t(CONF_KEY[exercise.confidence])}` : ''}
        </p>
      )}
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
  const [roles, setRoles] = useState<Partial<Record<MuscleId, 'principal' | 'secundario'>>>({});

  // Un toque: principal · dos: secundario · tres: quitar.
  const cycle = (id: MuscleId) =>
    setRoles((prev) => {
      const next = { ...prev };
      if (!prev[id]) next[id] = 'principal';
      else if (prev[id] === 'principal') next[id] = 'secundario';
      else delete next[id];
      return next;
    });

  // Principal 1,0 y secundario 0,5 (los ejercicios propios no llevan coeficientes finos).
  const muscles: MuscleActivation[] = MUSCLES.flatMap((id) => {
    const role = roles[id];
    return role ? [{ id, role, activation: role === 'principal' ? 1 : 0.5 }] : [];
  });
  const activations: Partial<Record<MuscleId, number>> = Object.fromEntries(muscles.map((m) => [m.id, m.activation]));
  const valid = name.trim().length > 1 && muscles.some((m) => m.role === 'principal');
  // Los del grupo elegido primero; dentro de cada bloque, orden anatómico (sort estable).
  const ordered = [...MUSCLES].sort((a, b) => Number(MUSCLE_GROUP[b] === group) - Number(MUSCLE_GROUP[a] === group));

  const submit = async () => {
    const id = await createCustomExercise({ nameEs: name, group, equipment, muscles, unilateral });
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
              className={`chip${roles[m] === 'principal' ? ' active' : ''}${roles[m] === 'secundario' ? ' gold active' : ''}`}
              onClick={() => cycle(m)}
            >
              {MUSCLE_SHORT_NAMES[m][lang]}
            </button>
          ))}
        </div>
      </div>
      <MuscleSummary activations={activations} size="sm" />
      <p className="tiny faint center">{t('customImageHint')}</p>
      <button className="btn primary block" disabled={!valid} onClick={submit}>
        {t('createAndAdd')}
      </button>
    </Sheet>
  );
}
