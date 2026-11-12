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

interface Dims {
  /** Semianchura a la altura del hombro, pecho, cintura y cadera. */
  S: number;
  C: number;
  W: number;
  H: number;
}

const DIMS: Record<Figure, Dims> = {
  male: { S: 40, C: 31, W: 24, H: 28 },
  female: { S: 34, C: 27, W: 20, H: 31 },
};

const CX = 100;

interface Pt {
  x: number;
  y: number;
}

/** Elipse alineada con un segmento (brazo, muslo…): centro en `t`, largo `scale` del segmento. */
function limb(a: Pt, b: Pt, rx: number, t = 0.5, scale = 0.7, shift = 0) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const angle = (-Math.atan2(dx, dy) * 180) / Math.PI;
  const cx = a.x + dx * t + shift;
  const cy = a.y + dy * t;
  return { cx, cy, rx, ry: (len * scale) / 2, transform: `rotate(${angle.toFixed(2)} ${cx.toFixed(2)} ${cy.toFixed(2)})` };
}

function points(list: [number, number][]): string {
  return list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}

export function BodyMap({ figure, levels = {}, colors = {}, frontLabel, backLabel, size = 'md' }: Props) {
  const clip = useId().replace(/:/g, '');
  const { S, C, W, H } = DIMS[figure];

  const fill = (id: MuscleId): string => {
    if (colors[id]) return colors[id] as string;
    const level = levels[id];
    if (level === 'primary') return 'var(--muscle-primary)';
    if (level === 'secondary') return 'var(--muscle-secondary)';
    return 'var(--muscle-idle)';
  };
  const m = (id: MuscleId) => ({ fill: fill(id), 'data-muscle': id });

  // Articulaciones del lado derecho de la imagen; el izquierdo se dibuja en espejo.
  const shoulder: Pt = { x: CX + S + 6, y: 72 };
  const elbow: Pt = { x: CX + S + 14, y: 150 };
  const wrist: Pt = { x: CX + S + 21, y: 220 };
  const hip: Pt = { x: CX + H * 0.52, y: 204 };
  const knee: Pt = { x: CX + H * 0.5, y: 302 };
  const ankle: Pt = { x: CX + H * 0.46, y: 398 };

  const torso = `M ${CX - 8},52 L ${CX + 8},52 L ${CX + S + 3},65 L ${CX + C},112 L ${CX + W},152 L ${CX + H},192 L ${CX + H},208
    Q ${CX},218 ${CX - H},208 L ${CX - H},192 L ${CX - W},152 L ${CX - C},112 L ${CX - S - 3},65 Z`;

  const base = (
    <g fill="var(--body-base)" stroke="var(--body-base)" strokeLinecap="round">
      <ellipse cx={CX} cy={25} rx={13.5} ry={16.5} stroke="none" />
      <rect x={CX - 7} y={36} width={14} height={20} stroke="none" />
      <path d={torso} stroke="none" />
      {[1, -1].map((side) => {
        const fx = (x: number) => CX + side * (x - CX);
        return (
          <g key={side}>
            <line x1={fx(shoulder.x)} y1={shoulder.y} x2={fx(elbow.x)} y2={elbow.y} strokeWidth={19} />
            <line x1={fx(elbow.x)} y1={elbow.y} x2={fx(wrist.x)} y2={wrist.y} strokeWidth={14.5} />
            <circle cx={fx(wrist.x + 1.5)} cy={wrist.y + 10} r={7.5} stroke="none" />
            <line x1={fx(hip.x)} y1={hip.y} x2={fx(knee.x)} y2={knee.y} strokeWidth={H * 0.96} />
            <line x1={fx(knee.x)} y1={knee.y} x2={fx(ankle.x)} y2={ankle.y} strokeWidth={18} />
            <ellipse cx={fx(ankle.x + 3)} cy={ankle.y + 13} rx={9.5} ry={6} stroke="none" />
          </g>
        );
      })}
    </g>
  );

  const pecPath = `M ${CX + 2.5},70 L ${CX + S - 9},68 Q ${CX + S - 2},85 ${CX + C - 3},101 Q ${CX + C * 0.55},113 ${CX + 2.5},107 Z`;

  const frontHalf = (
    <>
      <polygon {...m('traps_upper')} points={points([[CX + 7.5, 48], [CX + S - 12, 62], [CX + 7.5, 61.5]])} />
      <ellipse {...m('delt_side')} cx={CX + S + 10.5} cy={77} rx={5.5} ry={12} transform={`rotate(-12 ${CX + S + 10.5} 77)`} />
      <ellipse {...m('delt_front')} cx={CX + S + 0.5} cy={75} rx={8.5} ry={11.5} transform={`rotate(-18 ${CX + S + 0.5} 75)`} />
      <g clipPath={`url(#${clip}-pec)`}>
        <rect {...m('chest_upper')} x={CX} y={60} width={60} height={21.5} />
        <rect {...m('chest_mid')} x={CX} y={83} width={60} height={10.5} />
        <rect {...m('chest_lower')} x={CX} y={95} width={60} height={24} />
      </g>
      {[0, 1, 2, 3].map((row) => (
        <rect key={row} {...m('abs')} x={CX + 1.5} y={115 + row * 19} width={10.5} height={16} rx={3.5} />
      ))}
      <polygon
        {...m('obliques')}
        points={points([[CX + 15, 116], [CX + C - 4, 116], [CX + W - 2.5, 152], [CX + H - 5, 190], [CX + 15, 190]])}
      />
      <ellipse {...m('biceps')} {...limb(shoulder, elbow, 7.5, 0.56, 0.58)} />
      <ellipse {...m('forearm')} {...limb(elbow, wrist, 5.8, 0.42, 0.7)} />
      <ellipse {...m('quads')} {...limb(hip, knee, H * 0.33, 0.5, 0.82, H * 0.08)} />
      <ellipse {...m('adductors')} cx={CX + H * 0.15} cy={236} rx={H * 0.105} ry={24} />
      <ellipse {...m('calves')} {...limb(knee, ankle, 6.5, 0.36, 0.5)} />
    </>
  );

  const backHalf = (
    <>
      <polygon {...m('traps_upper')} points={points([[CX, 42], [CX + 7.5, 46], [CX + S - 5, 63.5], [CX, 72]])} />
      <polygon {...m('traps_mid')} points={points([[CX, 75], [CX + S - 9, 66.5], [CX + S - 15, 81], [CX, 132]])} />
      <ellipse {...m('delt_side')} cx={CX + S + 10.5} cy={77} rx={5.5} ry={12} transform={`rotate(-12 ${CX + S + 10.5} 77)`} />
      <ellipse {...m('delt_rear')} cx={CX + S + 0.5} cy={75} rx={8.5} ry={11.5} transform={`rotate(-18 ${CX + S + 0.5} 75)`} />
      <polygon
        {...m('upper_back')}
        points={points([[CX + S - 12.5, 84], [CX + S - 3, 81], [CX + C, 101], [CX + (S - 15) * 0.52 + 2.5, 106]])}
      />
      <path
        {...m('lats')}
        d={`M ${CX + C + 0.5},105 Q ${CX + C - 1},130 ${CX + W - 0.5},151 L ${CX + 6},151 L ${CX + 3},136 L ${CX + (S - 15) * 0.52 + 2},110 Z`}
      />
      <rect {...m('lower_back')} x={CX + 2} y={155} width={11.5} height={34} rx={4.5} />
      <ellipse {...m('glute_med')} cx={CX + H * 0.6} cy={196} rx={H * 0.33} ry={6.5} />
      <ellipse {...m('glute_max')} cx={CX + H * 0.5} cy={214} rx={H * 0.46} ry={14.5} />
      <ellipse {...m('triceps')} {...limb(shoulder, elbow, 7.5, 0.54, 0.6)} />
      <ellipse {...m('forearm')} {...limb(elbow, wrist, 5.8, 0.42, 0.7)} />
      <ellipse {...m('hamstrings')} {...limb(hip, knee, H * 0.34, 0.6, 0.6)} />
      <ellipse {...m('calves')} {...limb(knee, ankle, 7.8, 0.36, 0.55)} />
    </>
  );

  const view = (half: ReactNode, label: string | undefined, key: string) => (
    <figure className="bodymap-view" key={key}>
      <svg viewBox="30 4 140 414" role="img" aria-label={label}>
        <defs>
          <clipPath id={`${clip}-pec`}>
            <path d={pecPath} />
          </clipPath>
        </defs>
        {base}
        <g>{half}</g>
        <g transform={`translate(${CX * 2} 0) scale(-1 1)`}>{half}</g>
      </svg>
      {label && <figcaption>{label}</figcaption>}
    </figure>
  );

  return (
    <div className={`bodymap bodymap-${size}`}>
      {view(frontHalf, frontLabel, 'front')}
      {view(backHalf, backLabel, 'back')}
    </div>
  );
}
