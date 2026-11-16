import { FileSpreadsheet } from 'lucide-react';
import { useState } from 'react';
import { exportMesocycle } from '../data/exportMesocycle';
import { useSettings, useT } from '../lib/settings';

interface Props {
  mesocycleId: string;
  /** `icon` = solo icono (barra superior); `block` = botón ancho con texto. */
  variant?: 'icon' | 'block';
}

/** Exporta el mesociclo a un Excel y lo comparte. Evita la doble pulsación mientras trabaja. */
export function ExportButton({ mesocycleId, variant = 'block' }: Props) {
  const t = useT();
  const { unit, lang } = useSettings();
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'failed'>('idle');

  const run = async () => {
    if (state === 'working') return;
    setState('working');
    try {
      setState((await exportMesocycle(mesocycleId, unit, lang)) ? 'done' : 'failed');
    } catch {
      setState('failed');
    }
  };

  const label = state === 'working' ? t('exporting') : t('exportExcel');
  return (
    <>
      {variant === 'icon' ? (
        <button
          className="icon-btn"
          onClick={run}
          disabled={state === 'working'}
          aria-label={t('exportExcel')}
          title={state === 'failed' ? t('exportFailed') : t('exportExcel')}
          style={state === 'failed' ? { color: 'var(--red-strong)' } : undefined}
        >
          <FileSpreadsheet />
        </button>
      ) : (
        <button className="btn block" onClick={run} disabled={state === 'working'}>
          <FileSpreadsheet size={16} /> {label}
        </button>
      )}
      {state === 'done' && variant === 'block' && <p className="tiny faint center">{t('exportDone')}</p>}
      {state === 'failed' && variant === 'block' && <p className="notice">{t('exportFailed')}</p>}
    </>
  );
}
