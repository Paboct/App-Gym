import { MUSCLE_SHORT_NAMES, type MuscleId } from '../domain/muscles';
import { sortedActivations } from '../lib/muscles';
import { useSettings, useT } from '../lib/settings';
import { BodyMap } from './BodyMap';

interface Props {
  activations: Partial<Record<MuscleId, number>>;
  size?: 'sm' | 'md' | 'lg';
  /** Muestra la lista compacta bajo el mapa (la ficha trae la suya). */
  showList?: boolean;
}

/** Mapa corporal (frente y espalda) con la leyenda de tramos y, debajo, los músculos con su % de activación. */
export function MuscleSummary({ activations, size = 'md', showList = true }: Props) {
  const { figure, lang } = useSettings();
  const t = useT();
  const list = sortedActivations(activations);
  return (
    <div className="col" style={{ gap: 8 }}>
      <BodyMap figure={figure} activations={activations} size={size} frontLabel={t('bodyFront')} backLabel={t('bodyBack')} />
      <div className="legend">
        <span>
          <i style={{ background: 'var(--act-high)' }} />
          {t('actHigh')}
        </span>
        <span>
          <i style={{ background: 'var(--act-mid)' }} />
          {t('actMid')}
        </span>
        <span>
          <i style={{ background: 'var(--act-low)' }} />
          {t('actLow')}
        </span>
      </div>
      {showList && list.length > 0 && (
        <p className="muscle-list">
          {list.map((m) => `${MUSCLE_SHORT_NAMES[m.id][lang]} ${Math.round(m.activation * 100)} %`).join(' · ')}
        </p>
      )}
    </div>
  );
}
