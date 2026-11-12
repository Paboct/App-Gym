import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stepper } from '../components/Stepper';
import { createMesocycle } from '../data/repo';
import { useT } from '../lib/settings';
import { useActiveMeso } from '../lib/useActiveMeso';

export function MesocycleWizard() {
  const t = useT();
  const navigate = useNavigate();
  const active = useActiveMeso();
  const [name, setName] = useState('');
  const [microcycles, setMicrocycles] = useState<number | null>(6);
  const [deload, setDeload] = useState(false);
  const [days, setDays] = useState<string[]>(['', '', '', '']);
  const [saving, setSaving] = useState(false);

  const valid = name.trim().length > 0 && (microcycles ?? 0) >= 1 && days.length > 0;

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    await createMesocycle({
      name,
      microcycles: microcycles ?? 6,
      deload,
      dayNames: days.map((d, i) => d.trim() || t('dayN', { n: i + 1 })),
    });
    navigate('/', { replace: true });
  };

  return (
    <div className="screen no-tabs">
      <div className="topbar">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label={t('back')}>
          <ArrowLeft />
        </button>
        <h1 className="grow">{t('newMesocycle')}</h1>
      </div>

      {active && <p className="notice">{t('replaceActiveNotice', { name: active.meso.name })}</p>}

      <label className="field">
        <span>{t('mesocycleName')}</span>
        <input className="input" value={name} placeholder={t('mesocycleNamePlaceholder')} onChange={(e) => setName(e.target.value)} />
      </label>

      <div className="card col">
        <div className="field">
          <span>{t('microcyclesCount')}</span>
          <Stepper value={microcycles} onChange={setMicrocycles} min={1} max={16} ariaLabel={t('microcyclesCount')} />
        </div>
        <label className="switch">
          <span>
            {t('deloadLastWeek')}
            <br />
            <span className="tiny faint">{t('deloadHint')}</span>
          </span>
          <input type="checkbox" checked={deload} onChange={(e) => setDeload(e.target.checked)} />
        </label>
      </div>

      <div className="section-title">
        <h2>{t('trainingDays')}</h2>
        <span className="small muted">{t('daysPerMicro', { n: days.length })}</span>
      </div>
      <p className="small muted">{t('daysSequenceHint')}</p>
      <div className="list">
        {days.map((day, i) => (
          <div className="row" key={i}>
            <span className="num muted" style={{ width: 54 }}>
              {t('dayN', { n: i + 1 })}
            </span>
            <input
              className="input grow"
              value={day}
              placeholder={t('dayNamePlaceholder')}
              onChange={(e) => setDays(days.map((d, j) => (j === i ? e.target.value : d)))}
            />
            <button
              className="icon-btn"
              disabled={days.length <= 1}
              onClick={() => setDays(days.filter((_, j) => j !== i))}
              aria-label={t('delete')}
            >
              <Trash2 />
            </button>
          </div>
        ))}
        <button className="btn ghost" onClick={() => setDays([...days, ''])} disabled={days.length >= 7}>
          <Plus size={18} /> {t('addDay')}
        </button>
      </div>

      <button className="btn primary lg block" disabled={!valid || saving} onClick={submit}>
        {t('createMesocycle')}
      </button>
    </div>
  );
}
