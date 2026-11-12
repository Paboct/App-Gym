import { useLiveQuery } from 'dexie-react-hooks';
import { createContext, useCallback, useContext, useEffect, type ReactNode } from 'react';
import { getSettings } from '../data/repo';
import { MUSCLE_NAMES, type MuscleId } from '../domain/muscles';
import { DEFAULT_SETTINGS, type Exercise, type Lang, type Settings } from '../domain/types';
import { STRINGS, type StringKey } from '../i18n/strings';

const SettingsContext = createContext<Settings>(DEFAULT_SETTINGS);

function resolveTheme(mode: Settings['theme']): 'dark' | 'light' {
  if (mode !== 'system') return mode;
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const settings = useLiveQuery(getSettings, []);

  useEffect(() => {
    if (!settings) return;
    const apply = () => {
      const theme = resolveTheme(settings.theme);
      document.documentElement.dataset.theme = theme;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0f0d0c' : '#f5efe7');
    };
    apply();
    document.documentElement.lang = settings.lang;
    const media = window.matchMedia?.('(prefers-color-scheme: light)');
    media?.addEventListener('change', apply);
    return () => media?.removeEventListener('change', apply);
  }, [settings]);

  if (!settings) return null;
  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Settings {
  return useContext(SettingsContext);
}

export type Translate = (key: StringKey, vars?: Record<string, string | number>) => string;

export function translate(lang: Lang, key: StringKey, vars?: Record<string, string | number>): string {
  let text: string = STRINGS[lang][key] ?? STRINGS.es[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
}

export function useT(): Translate {
  const { lang } = useSettings();
  return useCallback((key, vars) => translate(lang, key, vars), [lang]);
}

export function exerciseName(exercise: Pick<Exercise, 'nameEs' | 'nameEn'> | undefined, lang: Lang): string {
  if (!exercise) return '—';
  return lang === 'es' ? exercise.nameEs : exercise.nameEn || exercise.nameEs;
}

export function muscleNames(ids: MuscleId[], lang: Lang): string {
  return ids.map((id) => MUSCLE_NAMES[id][lang]).join(', ');
}
