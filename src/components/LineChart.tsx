import { useId } from 'react';
import type { SeriesPoint } from '../domain/kpi';

interface Props {
  points: SeriesPoint[];
  /** Unidad para la etiqueta del valor máximo (p. ej. «kg»). */
  unit?: string;
  /** Formatea un valor para las etiquetas. */
  format?: (value: number) => string;
  height?: number;
}

const W = 320;
const PAD_L = 8;
const PAD_R = 8;
const PAD_T = 16;
const PAD_B = 22;

/** Gráfica de línea con área, pensada para series pequeñas (volumen por sesión). */
export function LineChart({ points, unit, format = (v) => Math.round(v).toLocaleString('es-ES'), height = 150 }: Props) {
  const gid = useId().replace(/:/g, '');
  const H = height;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const max = Math.max(1, ...points.map((p) => p.value));
  const n = points.length;

  const x = (i: number) => PAD_L + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => PAD_T + plotH - (v / max) * plotH;

  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${PAD_L},${PAD_T + plotH} ${line} ${(PAD_L + plotW).toFixed(1)},${(PAD_T + plotH).toFixed(1)}`;

  // Etiquetas del eje X: primera, central y última, para no amontonar.
  const labelIdx = n <= 1 ? [0] : [...new Set([0, Math.floor((n - 1) / 2), n - 1])];
  const last = points[n - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Gráfica de evolución" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`${gid}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--red)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--red)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Línea base y máximo */}
      <line x1={PAD_L} y1={PAD_T + plotH} x2={PAD_L + plotW} y2={PAD_T + plotH} stroke="var(--line)" strokeWidth="1" />
      <text x={PAD_L} y={PAD_T - 4} fontSize="11" fill="var(--faint)">
        {format(max)}
        {unit ? ` ${unit}` : ''}
      </text>
      {n > 0 && (
        <>
          <polygon points={area} fill={`url(#${gid}-fill)`} />
          <polyline points={line} fill="none" stroke="var(--red)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p, i) => (
            <circle key={i} cx={x(i)} cy={y(p.value)} r={i === n - 1 ? 4 : 2.5} fill={i === n - 1 ? 'var(--gold)' : 'var(--red)'} />
          ))}
          {last && (
            <text x={Math.min(x(n - 1), W - 2)} y={Math.max(y(last.value) - 8, 10)} fontSize="11" fontWeight="700" fill="var(--gold)" textAnchor="end">
              {format(last.value)}
            </text>
          )}
          {labelIdx.map((i) => (
            <text key={i} x={x(i)} y={H - 6} fontSize="10" fill="var(--faint)" textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}>
              {points[i].label}
            </text>
          ))}
        </>
      )}
    </svg>
  );
}
