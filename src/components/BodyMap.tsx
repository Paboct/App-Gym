import { BODY, type BodyView } from '../data/bodyArt';
import { activationBand } from '../domain/exerciseMuscles';
import type { MuscleId } from '../domain/muscles';
import type { Figure } from '../domain/types';

interface Props {
  figure: Figure;
  /** Activación (0–1) por músculo: se pinta por tramos alto/medio/bajo (rutinas y fichas). */
  activations?: Partial<Record<MuscleId, number>>;
  /** Color directo por músculo (para el ranking de los KPIs). Manda sobre `activations`. */
  colors?: Partial<Record<MuscleId, string>>;
  frontLabel?: string;
  backLabel?: string;
  size?: 'sm' | 'md' | 'lg';
}

const BAND_FILL = { high: 'var(--act-high)', mid: 'var(--act-mid)', low: 'var(--act-low)' } as const;

/**
 * Mapa corporal anatómico de 35 zonas (frente y espalda). Cada zona se pinta con
 * su color directo (KPIs) o, si no, con el tramo de su activación; sin datos, en
 * reposo. Los músculos sin zona visible no rompen nada: simplemente no se dibujan.
 */
export function BodyMap({ figure, activations = {}, colors = {}, frontLabel, backLabel, size = 'md' }: Props) {
  const fill = (id: MuscleId): string => {
    const direct = colors[id];
    if (direct) return direct;
    const a = activations[id];
    if (a != null && a > 0) return BAND_FILL[activationBand(a)];
    return 'var(--muscle-idle)';
  };

  const renderView = (view: BodyView, label: string | undefined, key: string) => (
    <figure className="bodymap-view" key={key}>
      <svg viewBox={view.viewBox} role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
        <g dangerouslySetInnerHTML={{ __html: view.base }} />
        {view.muscles.map((m, i) => (
          <g
            key={i}
            data-muscle={m.id}
            style={{ fill: fill(m.id), stroke: 'var(--body-line)' }}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            dangerouslySetInnerHTML={{ __html: m.el }}
          />
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
