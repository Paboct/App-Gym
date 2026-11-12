import { APP_NAME } from '../config';

// Letras del logotipo dibujadas a trazo (la A va sin travesaño, como en el logo).
const GLYPHS: Record<string, string> = {
  L: 'M0 0V50H36',
  E: 'M36 0H0V50H36M0 25H30',
  G: 'M38 0H0V50H38V27H20',
  A: 'M0 50 20 0 40 50',
  C: 'M38 0H0V50H38',
  Y: 'M0 0 20 24 40 0M20 24V50',
};
const ADVANCE = 68;

/** Logotipo «LEGACY». Toma el color del texto que lo rodea. */
export function Wordmark({ className }: { className?: string }) {
  const letters = APP_NAME.toUpperCase().split('');
  const width = (letters.length - 1) * ADVANCE + 40;
  return (
    <svg className={className} viewBox={`-4 -4 ${width + 8} 58`} role="img" aria-label={APP_NAME}>
      <g fill="none" stroke="currentColor" strokeWidth={7.5} strokeLinecap="butt" strokeLinejoin="miter">
        {letters.map((letter, i) => (
          <path key={i} d={GLYPHS[letter] ?? ''} transform={`translate(${i * ADVANCE} 0)`} />
        ))}
      </g>
    </svg>
  );
}
