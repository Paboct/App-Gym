import { BODY, type BodyView } from '../data/bodyArt';
import { MUSCLE_GROUP, type MuscleId } from '../domain/muscles';
import type { Figure } from '../domain/types';

export type MuscleLevel = 'primary' | 'secondary';

interface Props {
  figure: Figure;
  /** Músculos resaltados por nivel de implicación (pantallas de rutina y ejercicio). */
  levels?: Partial<Record<MuscleId, MuscleLevel>>;
  /** Color directo por músculo (para el ranking de los KPIs). Manda sobre `levels`. */
  colors?: Partial<Record<MuscleId, string>>;
  frontLabel?: string;
  backLabel?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Mapa corporal anatómico (frente y espalda). Cada grupo muscular se colorea
 * por su rango (KPIs) o por su nivel de implicación (rutinas). El coloreado es
 * por grupo, así que un músculo hereda el color/nivel más fuerte de su grupo
 * aunque el dibujo no distinga ese sub-músculo concreto.
 */
export function BodyMap({ figure, levels = {}, colors = {}, frontLabel, backLabel, size = 'md' }: Props) {
  // Nivel efectivo de un músculo = el más fuerte de su grupo (para que, p.ej.,
  // un ejercicio que trabaja el deltoides lateral ilumine el hombro dibujado).
  const groupLevel = (id: MuscleId): MuscleLevel | undefined => {
    const g = MUSCLE_GROUP[id];
    let best: MuscleLevel | undefined;
    for (const [m, mg] of Object.entries(MUSCLE_GROUP) as [MuscleId, typeof g][]) {
      if (mg !== g) continue;
      const lv = levels[m];
      if (lv === 'primary') return 'primary';
      if (lv === 'secondary') best = 'secondary';
    }
    return best;
  };

  const fill = (id: MuscleId): string => {
    if (colors[id]) return colors[id] as string;
    const level = levels[id] ?? groupLevel(id);
    if (level === 'primary') return 'var(--muscle-primary)';
    if (level === 'secondary') return 'var(--muscle-secondary)';
    return 'var(--muscle-idle)';
  };

  const renderView = (view: BodyView, label: string | undefined, key: string) => (
    <figure className="bodymap-view" key={key}>
      <svg viewBox={view.viewBox} role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
        <g fill="var(--body-base)" dangerouslySetInnerHTML={{ __html: view.base }} />
        {view.muscles.map((m, i) => (
          <g key={i} fill={fill(m.id)} data-muscle={m.id} dangerouslySetInnerHTML={{ __html: m.el }} />
        ))}
      </svg>
      {label && <figcaption>{label}</figcaption>}
    </figure>
  );

  const body = BODY[figure] ?? BODY.male;
  return (
    <div className={`bodymap bodymap-${size}`}>
      {renderView(body.front, frontLabel, 'front')}
      {renderView(body.back, backLabel, 'back')}
    </div>
  );
}
