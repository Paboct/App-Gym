import { useLiveQuery } from 'dexie-react-hooks';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Stepper } from '../components/Stepper';
import { APP_NAME, APP_VERSION } from '../config';
import { db } from '../data/db';
import { addBodyWeight, removeBodyWeight, saveSetting } from '../data/repo';
import { formatWeight, unitToKg } from '../domain/calc';
import type { Figure, Lang, ThemeMode, Unit } from '../domain/types';
import { useSettings, useT } from '../lib/settings';

interface SegmentProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

function Segmented<T extends string>({ value, options, onChange }: SegmentProps<T>) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button key={o.value} className={o.value === value ? 'active' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ProfileScreen() {
  const t = useT();
  const settings = useSettings();
  const [weight, setWeight] = useState<number | null>(null);
  const weights = useLiveQuery(async () => (await db.bodyWeights.orderBy('date').reverse().limit(8).toArray()), []);

  return (
    <div className="screen">
      <h1>{t('tabProfile')}</h1>

      <div className="card col">
        <h3>{t('preferences')}</h3>
        <div className="field">
          <span>{t('language')}</span>
          <Segmented<Lang>
            value={settings.lang}
            onChange={(v) => saveSetting('lang', v)}
            options={[
              { value: 'es', label: 'Español' },
              { value: 'en', label: 'English' },
            ]}
          />
        </div>
        <div className="field">
          <span>{t('theme')}</span>
          <Segmented<ThemeMode>
            value={settings.theme}
            onChange={(v) => saveSetting('theme', v)}
            options={[
              { value: 'dark', label: t('themeDark') },
              { value: 'light', label: t('themeLight') },
              { value: 'system', label: t('themeSystem') },
            ]}
          />
        </div>
        <div className="field">
          <span>{t('units')}</span>
          <Segmented<Unit>
            value={settings.unit}
            onChange={(v) => saveSetting('unit', v)}
            options={[
              { value: 'kg', label: 'kg' },
              { value: 'lb', label: 'lb' },
            ]}
          />
        </div>
        <div className="field">
          <span>{t('figure')}</span>
          <Segmented<Figure>
            value={settings.figure}
            onChange={(v) => saveSetting('figure', v)}
            options={[
              { value: 'male', label: t('figureMale') },
              { value: 'female', label: t('figureFemale') },
            ]}
          />
        </div>
      </div>

      <div className="card col">
        <h3>{t('bodyWeight')}</h3>
        <p className="tiny faint">{t('bodyWeightHint')}</p>
        <div className="row">
          <div className="grow">
            <Stepper value={weight} onChange={setWeight} step={0.5} decimals placeholder={settings.unit} ariaLabel={t('bodyWeight')} />
          </div>
          <button
            className="btn primary"
            disabled={!weight}
            onClick={async () => {
              await addBodyWeight(unitToKg(weight as number, settings.unit));
              setWeight(null);
            }}
          >
            {t('log')}
          </button>
        </div>
        {weights?.map((w) => (
          <div key={w.id} className="row between small">
            <span className="muted">{w.date}</span>
            <span className="row">
              <span className="num">
                {formatWeight(w.kg, settings.unit, settings.lang)} {settings.unit}
              </span>
              <button className="icon-btn" onClick={() => removeBodyWeight(w.id)} aria-label={t('delete')}>
                <Trash2 />
              </button>
            </span>
          </div>
        ))}
      </div>

      <div className="card col">
        <h3>{t('cloud')}</h3>
        <p className="small muted">{t('cloudPending')}</p>
      </div>

      <p className="tiny faint center">
        {APP_NAME} · v{APP_VERSION}
      </p>
    </div>
  );
}
