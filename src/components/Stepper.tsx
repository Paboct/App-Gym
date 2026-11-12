import { useEffect, useState } from 'react';

interface Props {
  value: number | null;
  onChange: (value: number | null) => void;
  step?: number;
  min?: number;
  max?: number;
  decimals?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  /** Solo el campo, sin botones − / + (para filas estrechas como las bajadas del dropset). */
  bare?: boolean;
}

function parse(text: string): number | null {
  const n = Number(text.replace(',', '.'));
  return text.trim() === '' || Number.isNaN(n) ? null : n;
}

function show(value: number | null): string {
  return value == null ? '' : String(Math.round(value * 100) / 100).replace('.', ',');
}

/** Campo numérico grande con botones − / +, pensado para usar con una mano en el gimnasio. */
export function Stepper({ value, onChange, step = 1, min = 0, max = 9999, decimals = false, placeholder = '–', ariaLabel, bare = false }: Props) {
  const [text, setText] = useState(show(value));

  useEffect(() => {
    // Sincroniza cuando el valor cambia desde fuera (otra serie, botones…).
    if (parse(text) !== value) setText(show(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const bump = (delta: number) => {
    const next = clamp((value ?? 0) + delta);
    setText(show(next));
    onChange(next);
  };

  const input = (
      <input
        className="input num-input"
        inputMode={decimals ? 'decimal' : 'numeric'}
        value={text}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const raw = e.target.value.replace(decimals ? /[^0-9.,]/g : /[^0-9]/g, '');
          setText(raw);
          const n = parse(raw);
          onChange(n == null ? null : clamp(n));
        }}
      />
  );
  if (bare) return input;

  return (
    <div className="stepper">
      <button type="button" onClick={() => bump(-step)} aria-label="−">
        −
      </button>
      {input}
      <button type="button" onClick={() => bump(step)} aria-label="+">
        +
      </button>
    </div>
  );
}
