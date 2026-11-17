# Catálogo con coeficientes · Parte 2: la app — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La app usa los 35 músculos con coeficiente de activación: catálogo nuevo, mapa corporal de 35 zonas (hombre y mujer), ficha ⓘ con descripción y %, y KPIs con series × activación.

**Architecture:** `data/catalogo/ejercicios.json` (parte 1, ya validado) se copia a `src/data/catalog.json` y `catalog.ts` lo convierte en `Exercise[]` con `muscles: MuscleActivation[]`. El mapa se genera desde los SVG etiquetados (`data-musculo`) con un script a `src/data/bodyArt.ts`. El volumen por grupo usa la activación máxima de sus músculos (sin estabilizadores) para no mover los umbrales de rango.

**Tech Stack:** React 19 + TypeScript + Vite, Dexie (IndexedDB), Supabase (SQL a mano), Vitest.

**Spec:** `docs/superpowers/specs/2026-11-17-catalogo-activacion-design.md` (incluye «Decisiones posteriores»). Parte 1: `docs/superpowers/plans/2026-11-17-catalogo-datos.md`.

## Global Constraints

- 35 músculos exactos, ids de `data/catalogo/musculos.json`. Los 12 grupos de la app (`GroupId`) se conservan; `MUSCLE_GROUP` 35 → 12 sale de `musculos.json` (`braquiorradial` queda en `biceps`, decisión del usuario).
- Roles `principal | secundario | estabilizador`. **Los estabilizadores se muestran (ficha y mapa) pero NO cuentan** en series efectivas ni en el volumen por grupo.
- Volumen por grupo = activación **máxima** de los músculos del grupo en el ejercicio (sin estabilizadores); por músculo individual = suma de series × activación.
- Escala de color de la ficha y del mapa de rutinas: `activación ≥ 0,8` rojo intenso · `0,4 ≤ a < 0,8` naranja · `a < 0,4` amarillo suave. El mapa de **KPIs** sigue coloreado por rango (Hierro…Legacy); no cambian los pesos 50/30/20 ni los umbrales de rango.
- Ningún `id` de ejercicio cambia (entrenos e imágenes `public/exercises/<id>.webp` apuntan a ellos).
- Ejercicios del usuario: principal = 1,0, secundario = 0,5 (se pulsa igual que hoy: principal → secundario → quitar).
- Los coeficientes son estimaciones y la ficha lo indica (muestra `confianza`).
- Dos figuras (hombre/mujer) con SVG propios: `C:\Users\ruizm\Downloads\gemini-svg.svg` (hombre) y `gemini-women.svg` (mujer); ambos con 40 grupos `<g class="muscle">` precedidos de un comentario con el nombre del músculo, **sin** `data-musculo`: se etiquetan por el comentario (mapa nombre → id en el Task 2).
- Migraciones SQL **a mano** (no hay `supabase_migrations`); nunca claves `service_role` ni secrets en el código.
- Español como idioma de trabajo y de commits con `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`; Windows CRLF (aviso de git normal). Comandos: `npm test`, `npm run typecheck`, `npm run android:sync`.

## Review Focus

- Usuario que actualiza la app con ejercicios propios guardados con ids antiguos (`chest_mid`…): la migración de Dexie los convierte; ninguno queda sin músculos.
- Fila remota de `custom_exercises` antigua (sin `muscles`): `fromRemote` la convierte con el mapa 22 → 35.
- Ejercicio cuyo único músculo de un grupo es estabilizador: aporta 0 a ese grupo (ni KPI ni volumen).
- Músculo sin zona visible en el SVG (transverso, sóleo, manguito…): no rompe el mapa y sigue apareciendo en la lista de la ficha.
- Las dos figuras cubren los 35 ids entre frente y espalda; `activación` exactamente 0,8 y 0,4 cae en el tramo superior (rojo / naranja).

## Estructura de archivos

| Archivo | Responsabilidad |
| --- | --- |
| `data/catalogo/catalogo-legacy.txt` | Copia del RAW antiguo de `catalog.ts` (referencia de ids/grupo/unilateral) |
| `src/domain/muscles.ts` | 35 `MUSCLES`, `MuscleId`, `MUSCLE_GROUP`, `MUSCLE_NAMES` (es/en), grupos, equipos |
| `src/domain/legacyMuscles.ts` | `LEGACY_MUSCLE_MAP` 22 → 35 y `convertLegacyMuscles()` |
| `src/domain/exerciseMuscles.ts` | helpers puros sobre `Exercise.muscles` y escala de color |
| `src/domain/types.ts` | `MuscleRole`, `MuscleActivation`, `Exercise` nuevo |
| `src/data/catalog.json` + `catalog.ts` | catálogo (copia de `ejercicios.json`) → `CATALOG: Exercise[]` |
| `src/data/bodyArt.ts` | generado por `scripts/catalogo/generar-bodyart.mjs` desde los SVG |
| `src/assets/body/hombre.svg`, `mujer.svg` | SVG etiquetados (fuente del generador) |
| `src/components/BodyMap.tsx`, `MuscleSummary.tsx`, `ExercisePicker.tsx` | UI |
| `src/domain/kpi.ts` | `groupActivation`, `effectiveSetsByMuscle` |
| `supabase/migrations/0004_exercise_muscles.sql` | columna `muscles jsonb` |

## Interfaces compartidas (las usan varias tareas)

```ts
// src/domain/types.ts
export type MuscleRole = 'principal' | 'secundario' | 'estabilizador';
export interface MuscleActivation { id: MuscleId; role: MuscleRole; activation: number } // (0,1]
export interface Exercise {
  id: string; nameEs: string; nameEn: string; group: GroupId; equipment: EquipmentId;
  muscles: MuscleActivation[];
  unilateral: boolean; custom: boolean; updatedAt: number;
  descriptionEs?: string; descriptionEn?: string;
  patternEs?: string; patternEn?: string;
  mechanics?: 'Compuesto' | 'Aislamiento' | 'Isométrico';
  confidence?: 'alta' | 'media' | 'baja';
}
// src/domain/exerciseMuscles.ts
export function countedMuscles(e: Exercise): MuscleActivation[];            // sin estabilizadores
export function groupActivation(e: Exercise, g: GroupId): number;          // máx de countedMuscles del grupo, 0 si ninguno
export function muscleActivations(es: (Exercise | undefined)[]): Partial<Record<MuscleId, number>>; // máx por músculo, incluye estabilizadores
export type ActivationBand = 'high' | 'mid' | 'low';
export function activationBand(a: number): ActivationBand;                 // ≥0,8 high · ≥0,4 mid · resto low
```

---

### Task 1: Congelar el catálogo antiguo como referencia

**Files:**
- Create: `data/catalogo/catalogo-legacy.txt`
- Modify: `scripts/catalogo/lib-catalog.mjs`, `tests/catalogData.test.ts`

**Interfaces:**
- Produces: `readCatalogRows()` de `lib-catalog.mjs` pasa a leer `data/catalogo/catalogo-legacy.txt` (mismas filas que hoy); `tests/catalogData.test.ts` compara `ejercicios.json` con esas filas, no con `CATALOG`.

- [ ] **Step 1:** Copiar el contenido de la plantilla `RAW` de `src/data/catalog.ts` (las 240 líneas `id|…`) a `data/catalogo/catalogo-legacy.txt`.
- [ ] **Step 2:** `lib-catalog.mjs` y `tests/catalogData.test.ts`: leer ese archivo (ruta desde `import.meta.url`) en vez de importar/parsear `catalog.ts`.
- [ ] **Step 3:** `npm test` y `npm run typecheck` — Esperado: igual que antes (140 pasan, 1 omitido).
- [ ] **Step 4: Commit** — «Referencia congelada del catálogo antiguo para los scripts y tests de datos».

---

### Task 2: Mapa corporal de 35 zonas (hombre y mujer)

**Files:**
- Create: `src/assets/body/hombre.svg`, `src/assets/body/mujer.svg`, `scripts/catalogo/etiquetar-svg.mjs`, `scripts/catalogo/generar-bodyart.mjs`, `src/data/bodyArtV2.ts` (generado), `tests/bodyArt.test.ts`

**Interfaces:**
- Produces: `src/data/bodyArtV2.ts` exporta `BODY2: Record<'male' | 'female', { front: BodyView2; back: BodyView2 }>` con `BodyView2 = { viewBox: string; base: string; muscles: { id: string; el: string }[] }` (`id` = id del catálogo, un `<g data-musculo>` puede repetirse en frente y espalda). Se sustituirá a `bodyArt.ts` en el Task 3.

- [ ] **Step 1: Test que falla** `tests/bodyArt.test.ts`: para `male` y `female`, la unión de ids de `front` y `back` = exactamente los 35 ids de `data/catalogo/musculos.json`; ningún `id` desconocido; ninguna zona sin `el`; `base` no vacío; en cada vista, `viewBox` abarca solo esa figura (anchura ≈ la mitad del SVG original). Además, ningún `el` contiene atributos `fill` ni `class="c-…"`.
- [ ] **Step 2:** `etiquetar-svg.mjs <entrada> <salida>`: añade `data-musculo="<id>"` a cada `<g class="muscle">` leyendo el comentario que lo precede, con este mapa nombre normalizado (minúsculas, sin tildes, sin texto entre paréntesis) → id: `trapecio superior`→`trapecio_superior`, `trapecio medio`→`trapecio_medio`, `trapecio inferior`→`trapecio_inferior`, `romboides`→`romboides`, `deltoides anterior|lateral|posterior`→`deltoides_*`, `pectoral clavicular|esternal|abdominal`→`pectoral_*`, `biceps braquial`→`biceps_braquial`, `braquial anterior`→`braquial_anterior`, `braquiorradial`→`braquiorradial`, `flexores antebrazo`→`flexores_antebrazo`, `extensores antebrazo`→`extensores_antebrazo`, `serrato anterior`→`serrato_anterior`, `recto abdominal`→`recto_abdominal`, `oblicuos`→`oblicuos`, `transverso del abdomen`→`transverso_abdomen`, `gluteo medio`→`gluteo_medio`, `gluteo mayor`→`gluteo_mayor`, `aductores`→`aductores`, `recto femoral`→`recto_femoral`, `cuadriceps vastos`→`cuadriceps_vastos`, `isquiotibiales`→`isquiotibiales`, `tibial anterior`→`tibial_anterior`, `gastrocnemio`→`gastrocnemio`, `soleo`→`soleo`, `manguito rotador`→`manguito_rotador`, `redondo mayor`→`redondo_mayor`, `dorsal ancho`→`dorsal_ancho`, `erectores espinales`→`erectores_espinales`, `triceps cabeza larga|lateral|medial`→`triceps_larga|lateral|medial`. Falla si un `<g class="muscle">` queda sin id. Ejecutarlo sobre los dos SVG de Descargas y guardar los resultados en `src/assets/body/`.
- [ ] **Step 3:** `generar-bodyart.mjs`: parsea los dos SVG (sin dependencias nuevas: tratamiento de texto), separa `#vista-frontal` y `#vista-trasera`, y escribe `src/data/bodyArtV2.ts`: `base` = silueta, articulaciones y tendones (todo lo que no es `.muscle`); `muscles` = un elemento por `<g data-musculo>` con los paths **sin** clases de color ni `fill` (el color lo pone el componente con `fill` en el `<g>` contenedor, y `stroke` blanco fino). `viewBox` por vista: recorta alrededor de cada figura (frente centrada en x=235, espalda en x=645 del SVG de 880×860).
- [ ] **Step 4:** Ejecutar el generador; `npx vitest run tests/bodyArt.test.ts` — Esperado: PASA.
- [ ] **Step 5:** Verificación visual: renderizar con el navegador en modo headless (p. ej. `chrome --headless --screenshot`) un SVG de prueba que colorea cada zona con un color distinto, para las dos figuras, y revisar que no hay zonas cortadas por el `viewBox`.
- [ ] **Step 6: Commit** — «Mapa corporal de 35 zonas (hombre y mujer) generado desde los SVG etiquetados».

---

### Task 3: Cambio de modelo (atómico)

Tarea grande a propósito: al cambiar `Exercise`, `MuscleId` y el mapa, el árbol solo vuelve a compilar cuando todos los usuarios se actualizan juntos.

**Files:**
- Modify: `src/domain/muscles.ts`, `src/domain/types.ts`, `src/data/catalog.ts`, `src/data/db.ts`, `src/data/repo.ts`, `src/data/syncMap.ts`, `src/components/BodyMap.tsx`, `src/components/MuscleSummary.tsx`, `src/components/ExercisePicker.tsx`, `src/lib/muscles.ts`, `src/lib/settings.tsx`, `src/screens/DayScreen.tsx`, `src/screens/SummaryScreen.tsx`, `src/domain/kpi.ts` (solo lo necesario para compilar: `groupWeight` → `groupActivation`), `src/index.css` (o donde estén `--muscle-*`: variables `--act-high`, `--act-mid`, `--act-low`), `src/i18n/strings.ts`
- Delete: `src/data/bodyArt.ts` (se sustituye por `bodyArtV2.ts` renombrado a `bodyArt.ts`, exportando `BODY`)
- Create: `src/data/catalog.json`, `src/domain/legacyMuscles.ts`, `src/domain/exerciseMuscles.ts`
- Test: `tests/legacyMuscles.test.ts`, `tests/exerciseMuscles.test.ts`, `tests/dbMigration.test.ts`; actualizar `tests/repo.test.ts`, `tests/syncMap.test.ts`, `tests/kpi.test.ts`, `tests/catalog.test.ts`

**Interfaces:**
- Consumes: `BODY2` del Task 2 (se renombra a `BODY`); `ejercicios.json` de la parte 1.
- Produces: las **Interfaces compartidas** de arriba; `LEGACY_MUSCLE_MAP: Record<string, string[]>`; `convertLegacyMuscles(primary: string[], secondary: string[]): MuscleActivation[]`; `CATALOG: Exercise[]` (240); `BodyMap` con props `figure`, `activations?: Partial<Record<MuscleId, number>>`, `colors?: Partial<Record<MuscleId, string>>` (color directo manda), `frontLabel`, `backLabel`, `size`; el prop antiguo `levels` desaparece.

- [ ] **Step 1: Tests que fallan.**
  - `legacyMuscles.test.ts`: `convertLegacyMuscles(['chest_mid'], ['delt_front','triceps'])` devuelve `pectoral_esternal` principal 1,0, `deltoides_anterior` secundario 0,5 y las 3 cabezas del tríceps secundario 0,5; mapa 22 → 35: `chest_upper→pectoral_clavicular`, `chest_mid→pectoral_esternal`, `chest_lower→pectoral_abdominal`, `delt_front|side|rear→deltoides_anterior|lateral|posterior`, `traps_upper→trapecio_superior`, `traps_mid→trapecio_medio,trapecio_inferior`, `upper_back→romboides,redondo_mayor`, `lats→dorsal_ancho`, `lower_back→erectores_espinales`, `biceps→biceps_braquial`, `triceps→triceps_larga,triceps_lateral,triceps_medial`, `forearm→flexores_antebrazo,extensores_antebrazo`, `abs→recto_abdominal`, `obliques→oblicuos`, `glute_max→gluteo_mayor`, `glute_med→gluteo_medio`, `quads→cuadriceps_vastos,recto_femoral`, `hamstrings→isquiotibiales`, `adductors→aductores`, `calves→gastrocnemio,soleo`; los 22 ids antiguos están todos; ningún destino fuera de los 35; si un mismo músculo sale principal y secundario gana el principal.
  - `exerciseMuscles.test.ts`: `countedMuscles` excluye estabilizadores; `groupActivation` = máx por grupo y 0 si el único músculo del grupo es estabilizador; `muscleActivations` incluye estabilizadores y toma el máximo entre ejercicios; `activationBand(0.8)==='high'`, `(0.79)==='mid'`, `(0.4)==='mid'`, `(0.39)==='low'`.
  - `dbMigration.test.ts`: una base con un ejercicio propio guardado en formato antiguo (`primary/secondary` con ids antiguos) abre con la versión 2 de Dexie y el ejercicio queda con `muscles` convertido y sin `primary/secondary`; un ejercicio del catálogo no se rompe; `ensureCatalog()` deja 240 ejercicios de catálogo con `muscles` no vacío.
  - `repo.test.ts`: el catálogo cumple (todo ejercicio con ≥ 1 `principal`, músculos ∈ `MUSCLES`, sin músculo repetido); `createCustomExercise` guarda principal 1,0 y secundario 0,5.
  - `syncMap.test.ts`: `customExercisesSync.toRemote(e)` escribe `muscles` (jsonb con id/role/activation) y deja `primary_muscles`/`secondary_muscles` en `[]`; `fromRemote` lee `muscles` si existe y, si no (fila antigua), convierte `primary_muscles`/`secondary_muscles` con `convertLegacyMuscles`.
- [ ] **Step 2: Ejecutar** `npm test` — Esperado: FALLAN (módulos y tipos nuevos no existen).
- [ ] **Step 3: Implementar el modelo:** `muscles.ts` con los 35 ids en orden anatómico (el de `musculos.json`), `MUSCLE_GROUP` y `MUSCLE_NAMES` (es/en) desde `musculos.json`; `types.ts` con `MuscleRole`, `MuscleActivation` y el `Exercise` nuevo; `legacyMuscles.ts`; `exerciseMuscles.ts`.
- [ ] **Step 4: Catálogo:** copiar `data/catalogo/ejercicios.json` a `src/data/catalog.json`; `catalog.ts` exporta `CATALOG: Exercise[]` mapeando cada entrada (`nombre→nameEs`, `nombre_en→nameEn`, `grupo→group`, `equipamiento→equipment`, `musculos[]→muscles` con `rol` y `activacion`, descripción, patrón, mecánica, confianza; `custom:false`, `updatedAt:0`). Borrar la plantilla RAW.
- [ ] **Step 5: Base de datos:** `db.ts` añade `this.version(2).stores({})` con `.upgrade()` que recorre `exercises` y, para los que tengan `primary`/`secondary`, escribe `muscles = convertLegacyMuscles(...)` y elimina los campos antiguos. `repo.ts` `createCustomExercise({ nameEs, group, equipment, muscles, unilateral })` (principal 1,0 / secundario 0,5 se calculan en el formulario).
- [ ] **Step 6: Sincronización:** `syncMap.ts` como dicen los tests de arriba.
- [ ] **Step 7: Mapa y resúmenes:** `bodyArt.ts` = el generado del Task 2 (exporta `BODY`); `BodyMap.tsx` pinta cada `<g>` de zona con `fill` según `colors[id]` → si no, la banda de `activationBand` (`var(--act-high|mid|low)`) → si no, `var(--muscle-idle)`; elimina el heredado por grupo (`groupLevel`). `lib/muscles.ts`: `muscleLevels/splitLevels` se sustituyen por `muscleActivations`. `MuscleSummary.tsx`: leyenda de 3 bandas (alto/medio/bajo) en lugar de principal/secundario y lista de músculos con su %. `DayScreen`/`SummaryScreen` pasan `activations`. Variables CSS y textos es/en nuevos.
- [ ] **Step 8: Formulario «crear ejercicio»** (`ExercisePicker.tsx`): los 35 chips ordenados con los del grupo elegido primero; mismo ciclo principal → secundario → quitar; guarda 1,0 / 0,5; válido con ≥ 1 principal.
- [ ] **Step 9: Compilar `kpi.ts`:** `groupWeight(exercise, group)` pasa a usar `groupActivation`; no se cambia nada más (el comportamiento exacto se fija en el Task 5).
- [ ] **Step 10:** `npm test` y `npm run typecheck` — Esperado: PASA todo. `npm run build` compila.
- [ ] **Step 11: Commit** — «Modelo de 35 músculos con coeficiente de activación en toda la app».

---

### Task 4: Ficha del ejercicio (ⓘ)

**Files:**
- Modify: `src/components/ExercisePicker.tsx` (`ExerciseDetail`), `src/components/MuscleSummary.tsx`, `src/i18n/strings.ts`
- Test: `tests/exerciseDetail.test.tsx` (si no hay entorno de componentes, extraer la lógica a `src/domain/exerciseMuscles.ts` y probarla ahí)

**Interfaces:**
- Consumes: `Exercise` ampliado, `activationBand`, `muscleActivations`.
- Produces: `muscleRows(e: Exercise): { id: MuscleId; role: MuscleRole; percent: number }[]` ordenadas por activación descendente (percent = `Math.round(activation × 100)`).

- [ ] **Step 1: Test que falla** para `muscleRows`: orden descendente, `percent` redondeado (0,65 → 65), incluye estabilizadores con su rol.
- [ ] **Step 2: Implementar** `muscleRows` y la ficha: etiquetas de patrón (`patternEs/En`) y mecánica; descripción según idioma (`descriptionEs/En`, si falta no se muestra el bloque); lista «Pectoral esternal · 100 %» con el rol y color de banda; mapa con la escala de 3 bandas; aviso «Coeficientes estimados» con la `confianza` del ejercicio. Los ejercicios propios del usuario no tienen descripción: la ficha sigue mostrando mapa y lista.
- [ ] **Step 3:** `npm test` y `npm run typecheck` — PASA.
- [ ] **Step 4: Commit** — «Ficha del ejercicio con descripción, patrón y porcentaje por músculo».

---

### Task 5: KPIs con series efectivas

**Files:**
- Modify: `src/domain/kpi.ts`, `src/screens/KpiScreen.tsx`, `tests/kpi.test.ts`

**Interfaces:**
- Consumes: `groupActivation`, `countedMuscles`.
- Produces: `effectiveSetsByMuscle(ctx: ScoreContext): Map<MuscleId, number>` — Σ (series de la semana × activación) por músculo, sin estabilizadores; el volumen y el ranking por grupo usan `groupActivation` (máximo, sin estabilizadores).

- [ ] **Step 1: Tests que fallan** (`tests/kpi.test.ts`): 4 series de press de banca + 3 de press militar → `deltoides_anterior` = 4×0,55 + 3×1,0 = 5,2 y `pectoral_esternal` = 4,0 (con los coeficientes del catálogo: usar ejercicios de prueba con esos valores, no el JSON); un estabilizador no suma; `groupActivation` hace que el volumen por grupo de un press de banca sea ≤ 1 serie por serie para «Pecho»; los tests existentes de rangos siguen pasando sin tocar umbrales ni pesos (si alguno cambia de valor por el nuevo `groupWeight`, anotar cuál y por qué en el informe).
- [ ] **Step 2: Implementar** `effectiveSetsByMuscle` y mostrar en `KpiScreen` una lista «Series efectivas por músculo (semana)» ordenada, solo músculos con > 0, bajo la gráfica de series semanales por grupo.
- [ ] **Step 3:** `npm test` y `npm run typecheck` — PASA.
- [ ] **Step 4: Commit** — «Series efectivas por músculo (series × activación) en los KPIs».

---

### Task 6: Nube, limpieza y documentación

**Files:**
- Create: `supabase/migrations/0004_exercise_muscles.sql`
- Delete: `scripts/audit-muscles.mjs`
- Modify: `docs/ESPECIFICACION.md`, `CLAUDE.md`, y los créditos de la app si citan `react-native-body-highlighter` (buscar el texto; la licencia MIT del dibujo antiguo deja de aplicar)

**Interfaces:**
- Produces: `0004_exercise_muscles.sql`: `alter table public.custom_exercises add column if not exists muscles jsonb;` (conserva `primary_muscles`/`secondary_muscles`); idempotente.

- [ ] **Step 1:** Escribir `0004_exercise_muscles.sql` y la nota «aplicar a mano en el editor SQL del proyecto Legacy» en `docs/ESPECIFICACION.md`.
- [ ] **Step 2:** Borrar `scripts/audit-muscles.mjs` (obsoleto; la validación vive en `tests/catalogData.test.ts`). Quitar o actualizar los créditos del mapa antiguo si existen.
- [ ] **Step 3:** Actualizar `docs/ESPECIFICACION.md` (estado, modelo de 35 músculos, estabilizadores, formato del catálogo, SVG) y `CLAUDE.md` (una línea: catálogo en `data/catalogo/` y mapa en `src/assets/body/`).
- [ ] **Step 4:** Verificación final: `npm test`, `npm run typecheck`, `npm run build` — PASA. Prueba manual en navegador (`npm run dev`): ficha ⓘ de «Press de banca» (descripción, % y mapa), mapa de KPIs en hombre y mujer (cambiando la figura en Perfil), crear un ejercicio propio.
- [ ] **Step 5: Commit** — «Migración 0004, limpieza y documentación del catálogo con activación».
