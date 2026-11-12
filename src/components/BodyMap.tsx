import { useId } from 'react';
import { BODY, type BodyView } from '../data/bodyArt';
import type { MuscleId } from '../domain/muscles';
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
 * Mapa corporal (frente y espalda) sobre las siluetas del usuario. Cada grupo
 * muscular es su propia forma, recortada a la silueta, y se colorea por su nivel
 * (rutinas) o por su rango (KPIs).
 */
export function BodyMap({ figure, levels = {}, colors = {}, frontLabel, backLabel, size = 'md' }: Props) {
  const uid = useId().replace(/:/g, '');

  const fill = (id: MuscleId): string => {
    if (colors[id]) return colors[id] as string;
    const level = levels[id];
    if (level === 'primary') return 'var(--muscle-primary)';
    if (level === 'secondary') return 'var(--muscle-secondary)';
    return 'var(--muscle-idle)';
  };

  const renderMuscles = (view: BodyView, pecId: string) =>
    view.muscles.map((m, i) => (
      <g
        key={i}
        fill={fill(m.id)}
        data-muscle={m.id}
        clipPath={m.clip && view.pecClip ? `url(#${pecId})` : undefined}
        dangerouslySetInnerHTML={{ __html: m.el }}
      />
    ));

  const renderView = (view: BodyView, label: string | undefined, key: string) => {
    const silId = `${uid}-${key}-sil`;
    const pecId = `${uid}-${key}-pec`;
    return (
      <figure className="bodymap-view" key={key}>
        <svg viewBox={view.viewBox} role="img" aria-label={label}>
          <defs>
            <clipPath id={silId}>
              <path d={view.silhouette} />
            </clipPath>
            {view.pecClip && (
              <clipPath id={pecId}>
                <path d={view.pecClip} />
              </clipPath>
            )}
          </defs>
          <path d={view.silhouette} fill="var(--body-base)" />
          <g clipPath={`url(#${silId})`}>
            <g>{renderMuscles(view, pecId)}</g>
            <g transform={`translate(${view.center * 2} 0) scale(-1 1)`}>{renderMuscles(view, pecId)}</g>
          </g>
        </svg>
        {label && <figcaption>{label}</figcaption>}
      </figure>
    );
  };

  const body = BODY[figure] ?? BODY.male;
  return (
    <div className={`bodymap bodymap-${size}`}>
      {renderView(body.front, frontLabel, 'front')}
      {renderView(body.back, backLabel, 'back')}
    </div>
  );
}
