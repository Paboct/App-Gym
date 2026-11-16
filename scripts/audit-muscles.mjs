// Compara los músculos del catálogo con los de free-exercise-db (solo a nivel de grupo).
// Uso: node scripts/audit-muscles.mjs <ruta al clon de free-exercise-db>
import { readFileSync } from 'node:fs';

const src = process.argv[2];
if (!src) {
  console.error('Uso: node scripts/audit-muscles.mjs <ruta al clon de free-exercise-db>');
  process.exit(1);
}

const GROUP_OF = {
  chest_upper: 'chest', chest_mid: 'chest', chest_lower: 'chest',
  delt_front: 'shoulders', delt_side: 'shoulders', delt_rear: 'shoulders',
  traps_upper: 'traps', traps_mid: 'traps', upper_back: 'back', lats: 'lats', lower_back: 'lower back',
  biceps: 'biceps', triceps: 'triceps', forearm: 'forearms', abs: 'abs', obliques: 'abs',
  glute_max: 'glutes', glute_med: 'glutes', quads: 'quads', hamstrings: 'hamstrings',
  adductors: 'adductors', calves: 'calves',
};
const DATASET_GROUP = {
  chest: 'chest', shoulders: 'shoulders', traps: 'traps', 'middle back': 'back', lats: 'lats',
  'lower back': 'lower back', biceps: 'biceps', triceps: 'triceps', forearms: 'forearms',
  abdominals: 'abs', quadriceps: 'quads', hamstrings: 'hamstrings', glutes: 'glutes',
  adductors: 'adductors', abductors: 'glutes', calves: 'calves', neck: 'neck',
};

const catalogSrc = readFileSync(new URL('../src/data/catalog.ts', import.meta.url), 'utf-8').split('`')[1];
const catalog = catalogSrc.trim().split('\n').filter((l) => l.includes('|')).map((l) => {
  const [id, es, en, , , p, s] = l.split('|');
  return { id, es, en, primary: p ? p.split(',') : [], secondary: s ? s.split(',') : [] };
});
const map = JSON.parse(readFileSync(new URL('./exercise-image-map.json', import.meta.url), 'utf-8'));
const dataset = new Map(JSON.parse(readFileSync(`${src}/dist/exercises.json`, 'utf-8')).map((e) => [e.id, e]));

const groups = (list, from) => new Set(list.map((m) => from[m] ?? m));
for (const ex of catalog) {
  const d = dataset.get(map[ex.id]);
  if (!d) continue;
  const cp = groups(ex.primary, GROUP_OF);
  const cs = groups(ex.secondary, GROUP_OF);
  const dp = groups(d.primaryMuscles, DATASET_GROUP);
  const ds = groups(d.secondaryMuscles, DATASET_GROUP);
  const missingPrimary = [...dp].filter((g) => !cp.has(g));
  const extraPrimary = [...cp].filter((g) => !dp.has(g));
  if (missingPrimary.length || extraPrimary.length) {
    console.log(`${ex.id} (${ex.es})\n  catálogo: P[${ex.primary}] S[${ex.secondary}]\n  dataset : P[${d.primaryMuscles}] S[${d.secondaryMuscles}]`);
  }
}
