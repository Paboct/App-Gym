import { splitLevels } from '../lib/muscles';
import { muscleNames, useSettings, useT } from '../lib/settings';
import type { MuscleId } from '../domain/muscles';
import { BodyMap, type MuscleLevel } from './BodyMap';

interface Props {
  levels: Partial<Record<MuscleId, MuscleLevel>>;
  size?: 'sm' | 'md' | 'lg';
}

/** Mapa corporal (frente y espalda) con leyenda y, debajo y en pequeño, los músculos trabajados. */
export function MuscleSummary({ levels, size = 'md' }: Props) {
  const { figure, lang } = useSettings();
  const t = useT();
  const { primary, secondary } = splitLevels(levels);
  return (
    <div className="col" style={{ gap: 8 }}>
      <BodyMap figure={figure} levels={levels} size={size} frontLabel={t('bodyFront')} backLabel={t('bodyBack')} />
      <div className="legend">
        <span>
          <i style={{ background: 'var(--muscle-primary)' }} />
          {t('primary')}
        </span>
        <span>
          <i style={{ background: 'var(--muscle-secondary)' }} />
          {t('secondary')}
        </span>
      </div>
      {primary.length + secondary.length > 0 && (
        <p className="muscle-list">
          {primary.length > 0 && (
            <>
              {t('primary')}: {muscleNames(primary, lang)}.
            </>
          )}
          {secondary.length > 0 && (
            <>
              {' '}
              {t('secondary')}: {muscleNames(secondary, lang)}.
            </>
          )}
        </p>
      )}
    </div>
  );
}
