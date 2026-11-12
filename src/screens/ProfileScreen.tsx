import { useLiveQuery } from 'dexie-react-hooks';
import { Cloud, CloudOff, LogOut, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Stepper } from '../components/Stepper';
import { APP_NAME, APP_VERSION } from '../config';
import { db } from '../data/db';
import { addBodyWeight, removeBodyWeight, saveSetting } from '../data/repo';
import { getSyncStatus, subscribeSync, syncNow } from '../data/sync';
import { formatWeight, unitToKg } from '../domain/calc';
import type { Figure, Lang, ThemeMode, Unit } from '../domain/types';
import { useAuth } from '../lib/auth';
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

      <AccountCard />

      <p className="tiny faint center">
        {APP_NAME} · v{APP_VERSION}
      </p>
    </div>
  );
}

function relativeTime(ts: number | null, lang: Lang): string | null {
  if (!ts) return null;
  const secs = Math.round((Date.now() - ts) / 1000);
  if (secs < 60) return lang === 'es' ? 'hace un momento' : 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return lang === 'es' ? `hace ${mins} min` : `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return lang === 'es' ? `hace ${hours} h` : `${hours} h ago`;
  return new Date(ts).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' });
}

/** Cuenta en la nube: iniciar o crear sesión, estado de sincronización y cerrar sesión. */
function AccountCard() {
  const t = useT();
  const { lang } = useSettings();
  const { user, ready, signIn, signUp, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [, force] = useState(0);

  useEffect(() => subscribeSync(() => force((n) => n + 1)), []);
  const sync = getSyncStatus();

  if (!ready) return null;

  if (user) {
    return (
      <div className="card col">
        <div className="row between">
          <h3>
            <Cloud size={18} style={{ verticalAlign: '-3px', marginRight: 6, color: 'var(--ok)' }} />
            {t('cloud')}
          </h3>
          <span className="badge ok">{t('synced')}</span>
        </div>
        <p className="small muted truncate">{user.email}</p>
        <p className="tiny faint">
          {sync.running
            ? t('syncing')
            : sync.lastError
              ? t('syncError')
              : sync.lastAt
                ? t('lastSync', { when: relativeTime(sync.lastAt, lang) ?? '' })
                : t('neverSynced')}
        </p>
        {sync.lastError && <p className="tiny" style={{ color: 'var(--red-strong)' }}>{sync.lastError}</p>}
        <div className="grid-2">
          <button className="btn" disabled={sync.running} onClick={() => syncNow()}>
            <RefreshCw size={16} /> {t('syncNow')}
          </button>
          <button className="btn ghost" onClick={() => signOut()}>
            <LogOut size={16} /> {t('signOut')}
          </button>
        </div>
      </div>
    );
  }

  const submit = async (mode: 'in' | 'up') => {
    setError(null);
    setInfo(null);
    if (!email.trim() || password.length < 6) {
      setError(t('authBadInput'));
      return;
    }
    setBusy(true);
    const res = mode === 'in' ? await signIn(email, password) : await signUp(email, password);
    setBusy(false);
    if (res.error) setError(res.error);
    else if ('needsConfirmation' in res && res.needsConfirmation) setInfo(t('authConfirmEmail'));
  };

  return (
    <div className="card col">
      <h3>
        <CloudOff size={18} style={{ verticalAlign: '-3px', marginRight: 6 }} />
        {t('cloud')}
      </h3>
      <p className="small muted">{t('cloudIntro')}</p>
      <label className="field">
        <span>{t('email')}</span>
        <input
          className="input"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
        />
      </label>
      <label className="field">
        <span>{t('password')}</span>
        <input
          className="input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('passwordHint')}
        />
      </label>
      {error && <p className="tiny" style={{ color: 'var(--red-strong)' }}>{error}</p>}
      {info && <p className="notice">{info}</p>}
      <div className="grid-2">
        <button className="btn primary" disabled={busy} onClick={() => submit('in')}>
          {t('signIn')}
        </button>
        <button className="btn" disabled={busy} onClick={() => submit('up')}>
          {t('signUp')}
        </button>
      </div>
      <p className="tiny faint">{t('cloudNote')}</p>
    </div>
  );
}
