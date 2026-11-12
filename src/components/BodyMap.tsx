import { useId, type ReactNode } from 'react';
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
 * Mapa corporal anatómico (frente y espalda) con los grupos musculares
 * dibujados por separado. Cada forma se dibuja en la mitad derecha y se refleja,
 * de modo que el cuerpo sale simétrico. Los músculos centrales (abdomen,
 * trapecio, lumbares) encajan en la línea media al reflejarse.
 */

// Formas de la mitad derecha (centro en x = 100). Cada entrada se refleja.
const FRONT: Partial<Record<MuscleId, string>> = {
  delt_front: 'M133,74 Q157,74 159,99 Q154,110 139,105 Q130,89 133,74 Z',
  // El pectoral se recorta en tres bandas (superior/medio/inferior).
  delt_side: 'M150,78 Q164,84 162,104 Q156,110 151,104 Q150,90 150,78 Z',
  biceps: 'M139,107 Q152,111 150,136 Q146,153 138,152 Q133,131 134,111 Q136,107 139,107 Z',
  forearm: 'M137,155 Q150,160 151,190 Q149,208 140,212 Q132,183 132,161 Q134,155 137,155 Z',
  obliques: 'M114,118 Q126,119 131,142 Q133,165 124,190 L113,194 Q116,155 114,118 Z',
  quads: 'M101,214 Q135,213 139,247 Q140,284 127,304 Q114,302 108,274 Q104,246 101,230 Z',
  adductors: 'M100,218 Q115,220 114,250 Q109,278 100,286 Z',
  calves: 'M107,308 Q122,310 122,346 Q120,386 111,404 Q105,376 105,336 Z',
};

const BACK: Partial<Record<MuscleId, string>> = {
  traps_upper: 'M100,55 Q120,61 152,80 L151,88 Q122,80 100,80 Z',
  traps_mid: 'M100,83 Q121,87 135,98 Q129,132 113,127 L100,127 Z',
  delt_rear: 'M133,74 Q157,74 159,99 Q154,110 139,105 Q130,89 133,74 Z',
  delt_side: 'M150,78 Q164,84 162,104 Q156,110 151,104 Q150,90 150,78 Z',
  upper_back: 'M100,99 Q119,98 131,104 Q141,109 139,119 Q128,126 114,125 Q105,121 100,117 Z',
  lats: 'M100,128 Q139,123 154,140 Q150,170 127,184 Q111,181 100,159 Z',
  lower_back: 'M100,156 L115,159 Q117,180 110,198 L100,200 Z',
  triceps: 'M138,107 Q151,111 149,137 Q145,154 138,153 Q133,130 135,111 Z',
  forearm: 'M137,155 Q150,160 151,190 Q149,208 140,212 Q132,183 132,161 Q134,155 137,155 Z',
  glute_med: 'M117,200 Q139,202 140,219 Q133,228 119,223 Q116,212 117,200 Z',
  glute_max: 'M100,210 Q127,210 139,227 Q137,252 117,257 Q104,251 100,236 Z',
  hamstrings: 'M103,260 Q134,258 135,296 Q129,320 116,324 Q106,306 103,278 Z',
  calves: 'M106,322 Q122,324 122,358 Q118,392 110,406 Q104,378 104,346 Z',
};

// Bandas del pectoral (se recortan a la silueta del pecho).
const PEC_CLIP = 'M100,71 L137,74 Q151,82 150,99 Q138,116 116,117 Q104,113 100,107 Z';
const PEC_BANDS: Record<'chest_upper' | 'chest_mid' | 'chest_lower', [number, number]> = {
  chest_upper: [70, 87],
  chest_mid: [87, 101],
  chest_lower: [101, 118],
};

export function BodyMap({ figure, levels = {}, colors = {}, frontLabel, backLabel, size = 'md' }: Props) {
  const clip = useId().replace(/:/g, '');
  // Figura femenina: silueta algo más estrecha de hombros (ajuste sutil).
  const sx = figure === 'female' ? 0.95 : 1;
  const bodyTransform = sx === 1 ? undefined : `translate(100,0) scale(${sx},1) translate(-100,0)`;

  const fill = (id: MuscleId): string => {
    if (colors[id]) return colors[id] as string;
    const level = levels[id];
    if (level === 'primary') return 'var(--muscle-primary)';
    if (level === 'secondary') return 'var(--muscle-secondary)';
    return 'var(--muscle-idle)';
  };

  // Silueta base (cuerpo), simétrica. El brazo y la pierna se reflejan.
  const base = (
    <g fill="var(--body-base)" stroke="none">
      <ellipse cx={100} cy={34} rx={16.5} ry={19} />
      <path d="M91,49 h18 v19 h-18 z" />
      <path d="M72,72 Q100,64 128,72 Q151,79 150,120 Q150,158 139,184 Q139,201 143,216 Q100,228 57,216 Q61,201 61,184 Q50,158 50,120 Q49,79 72,72 Z" />
      {[1, -1].map((s) => (
        <g key={s} transform={s === -1 ? 'translate(200,0) scale(-1,1)' : undefined}>
          <path d="M149,78 Q165,84 163,118 Q161,154 153,190 Q151,206 144,214 Q134,208 136,152 Q138,106 142,82 Z" />
          <ellipse cx={146} cy={222} rx={9} ry={7} />
          <path d="M100,210 Q141,214 139,254 Q137,302 131,348 Q127,398 118,414 Q108,408 106,348 Q104,288 100,236 Z" />
          <ellipse cx={116} cy={414} rx={10} ry={6.5} />
        </g>
      ))}
    </g>
  );

  const half = (paths: Partial<Record<MuscleId, string>>, withPec: boolean) => (
    <>
      {withPec && (
        <g clipPath={`url(#${clip}-pec)`}>
          {(Object.keys(PEC_BANDS) as (keyof typeof PEC_BANDS)[]).map((band) => (
            <rect key={band} data-muscle={band} x={99} y={PEC_BANDS[band][0]} width={60} height={PEC_BANDS[band][1] - PEC_BANDS[band][0]} fill={fill(band)} />
          ))}
        </g>
      )}
      {(Object.entries(paths) as [MuscleId, string][]).map(([id, d]) => (
        <path key={id} d={d} data-muscle={id} fill={fill(id)} />
      ))}
    </>
  );

  // Abdomen: rejilla del recto (mitad derecha), se refleja para la otra columna.
  const abs = (
    <>
      {[0, 1, 2, 3].map((row) => (
        <rect key={row} data-muscle="abs" x={100.5} y={120 + row * 17} width={13} height={14} rx={4} fill={fill('abs')} />
      ))}
    </>
  );

  const view = (paths: Partial<Record<MuscleId, string>>, withPec: boolean, extra: ReactNode, label: string | undefined, key: string) => (
    <figure className="bodymap-view" key={key}>
      <svg viewBox="30 8 140 420" role="img" aria-label={label}>
        <defs>
          <clipPath id={`${clip}-pec`}>
            <path d={PEC_CLIP} />
          </clipPath>
        </defs>
        <g transform={bodyTransform}>
          {base}
          {[1, -1].map((s) => (
            <g key={s} transform={s === -1 ? 'translate(200,0) scale(-1,1)' : undefined}>
              {half(paths, withPec)}
              {extra}
            </g>
          ))}
        </g>
      </svg>
      {label && <figcaption>{label}</figcaption>}
    </figure>
  );

  return (
    <div className={`bodymap bodymap-${size}`}>
      {view(FRONT, true, abs, frontLabel, 'front')}
      {view(BACK, false, null, backLabel, 'back')}
    </div>
  );
}
