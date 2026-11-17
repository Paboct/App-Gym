import { MUSCLES, type MuscleId } from '../domain/muscles';

export { muscleActivations } from '../domain/exerciseMuscles';

/** Músculos con activación, de mayor a menor (a igualdad, en orden anatómico). */
export function sortedActivations(
  activations: Partial<Record<MuscleId, number>>,
): { id: MuscleId; activation: number }[] {
  return MUSCLES.flatMap((id) => {
    const activation = activations[id];
    return activation != null && activation > 0 ? [{ id, activation }] : [];
  }).sort((a, b) => b.activation - a.activation);
}
