import { useState } from 'react';
import type { Exercise } from '../domain/types';
import { exerciseImageUrl } from '../lib/exerciseImage';
import { exerciseName, useSettings } from '../lib/settings';

interface Props {
  exercise: Exercise;
  size?: 'sm' | 'md';
}

/** Foto de la pose del ejercicio con acabado oscuro. Sin foto (o si falla al cargar) no pinta nada. */
export function ExerciseImage({ exercise, size = 'md' }: Props) {
  const { lang } = useSettings();
  const [failed, setFailed] = useState(false);
  const url = exerciseImageUrl(exercise.id);
  if (!url || failed) return null;
  return (
    <img
      className={`ex-photo ${size}`}
      src={url}
      alt={exerciseName(exercise, lang)}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
