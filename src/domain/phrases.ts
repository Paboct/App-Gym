import type { Lang } from './types';

const PHRASES: Record<Lang, string[]> = {
  es: [
    'La disciplina pesa menos que el arrepentimiento.',
    'Hoy has hecho lo que otros dejan para mañana.',
    'Una repetición más que ayer. Así se forja.',
    'El hierro no miente: lo que le das, te devuelve.',
    'La constancia gana donde el talento se cansa.',
    'No fue fácil. Por eso cuenta.',
    'Cada serie es un voto por quien quieres ser.',
    'El progreso se construye en días como este.',
    'Fuerte no se nace: se entrena.',
    'Los dioses ayudan a quien suda.',
    'Cansado sí. Derrotado nunca.',
    'Otro ladrillo en el templo.',
  ],
  en: [
    'Discipline weighs less than regret.',
    'Today you did what others put off until tomorrow.',
    'One more rep than yesterday. That is how it is forged.',
    'Iron never lies: you get back what you put in.',
    'Consistency wins where talent gets tired.',
    'It was not easy. That is why it counts.',
    'Every set is a vote for who you want to be.',
    'Progress is built on days like this.',
    'Nobody is born strong. Strength is trained.',
    'The gods help those who sweat.',
    'Tired, yes. Defeated, never.',
    'Another brick in the temple.',
  ],
};

/** Frase de motivación estable para un entreno (la misma cada vez que se abre su resumen). */
export function phraseFor(seed: string, lang: Lang): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const list = PHRASES[lang];
  return list[hash % list.length];
}
