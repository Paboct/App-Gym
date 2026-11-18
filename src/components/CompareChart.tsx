export interface CompareSeries {
  label: string;
  color: string;
  points: { x: number; y: number; tag?: string }[];
}

interface Props {
  series: CompareSeries[];
  /** Etiqueta del eje X para una posición (por defecto, el número). */
  xLabel?: (x: number) => string;
  /** Formatea el valor máximo mostrado arriba a la izquierda. */
  format?: (y: number) => string;
  height?: number;
}

const W = 320;
const PAD_L = 8;
const PAD_R = 14;
const PAD_T = 26;
const PAD_B = 22;
/** Con más puntos que esto por serie, no se escriben etiquetas sobre los puntos. */
const MAX_TAGGED = 8;

/** Gráfica de varias líneas (una por serie, un color cada una) con leyenda. */
export function CompareChart({ series, xLabel = (x) => String(x), format = (y) => Math.round(y).toLocaleString('es-ES'), height = 190 }: Props) {
  const H = height;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const all = series.flatMap((s) => s.points);
  const xs = [...new Set(all.map((p) => p.x))].sort((a, b) => a - b);
  const xMin = xs[0] ?? 0;
  const xMax = xs[xs.length - 1] ?? 0;
  const yMax = Math.max(1, ...all.map((p) => p.y));

  const x = (v: number) => PAD_L + (xMax === xMin ? plotW / 2 : ((v - xMin) / (xMax - xMin)) * plotW);
  const y = (v: number) => PAD_T + plotH - (v / yMax) * plotH;
  const labelXs = xs.length <= 10 ? xs : [xs[0], xs[Math.floor((xs.length - 1) / 2)], xs[xs.length - 1]];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Gráfica comparativa" style={{ display: 'block' }}>
        <line x1={PAD_L} y1={PAD_T + plotH} x2={PAD_L + plotW} y2={PAD_T + plotH} stroke="var(--line)" strokeWidth="1" />
        <text x={PAD_L} y={12} fontSize="11" fill="var(--faint)">
          {format(yMax)}
        </text>
        {series.map((s, si) => {
          const tagged = s.points.length <= MAX_TAGGED;
          return (
            <g key={s.label}>
              <polyline
                points={s.points.map((p) => `${x(p.x).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ')}
                fill="none"
                stroke={s.color}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {s.points.map((p) => (
                <g key={p.x}>
                  <circle cx={x(p.x)} cy={y(p.y)} r="3.5" fill={s.color} />
                  {tagged && p.tag && (
                    <text
                      x={Math.min(Math.max(x(p.x), 24), W - 24)}
                      y={si % 2 === 0 ? Math.max(y(p.y) - 8, 10) : y(p.y) + 16}
                      fontSize="9.5"
                      fontWeight="700"
                      fill={s.color}
                      textAnchor="middle"
                    >
                      {p.tag}
                    </text>
                  )}
                </g>
              ))}
            </g>
          );
        })}
        {labelXs.map((v) => (
          <text key={v} x={x(v)} y={H - 6} fontSize="10" fill="var(--faint)" textAnchor="middle">
            {xLabel(v)}
          </text>
        ))}
      </svg>
      <div className="row wrap" style={{ gap: 14, justifyContent: 'center' }}>
        {series.map((s) => (
          <span key={s.label} className="tiny">
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 5, background: s.color, marginRight: 5 }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
