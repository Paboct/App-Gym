# Imágenes de ejercicios — plan de implementación

> **Para quien lo ejecute:** usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans. Los pasos usan casillas `- [ ]`.

**Goal:** Que cada ejercicio muestre una tarjeta oscura con foto de la pose y el muñeco con sus músculos correctos, y ampliar el catálogo con ejercicios que tengan foto.

**Architecture:** Un script offline procesa las fotos de *free-exercise-db* (tinte oscuro, 400 px, WebP) y las deja en `public/exercises/<id>.webp`, junto a un índice generado `src/data/exerciseImages.ts`. Un componente `ExerciseImage` pinta la foto (o nada si no hay) junto al `MuscleSummary` ya existente dentro de `ExerciseDetail`. Los músculos salen del catálogo, que se audita antes.

**Tech Stack:** React 19, Vite, Vitest (entorno node), Capacitor, `sharp` (solo desarrollo, para el script).

**Spec:** `docs/superpowers/specs/2026-11-16-exercise-images-design.md`

## Global Constraints

- Fuente de fotos: `yuhonas/free-exercise-db`, licencia Unlicense. No se usa ninguna imagen de Symmetry.
- No se cambia ningún `id` de ejercicio existente (los entrenos guardados apuntan a ellos).
- Una sola foto por ejercicio, unos 400 px de lado, WebP, 15–25 KB. Total esperado 4–6 MB.
- Funciona sin conexión: las fotos van dentro de la app (`public/exercises/`).
- Los músculos resaltados deben ser los que el ejercicio trabaja de verdad (principales y secundarios).
- Un ejercicio sin foto sigue mostrando el muñeco con los músculos; nunca queda sin imagen.
- Ejercicios creados por el usuario (`custom`) no tienen foto y no deben dar error.
- Formato del catálogo: `id|nombre ES|nombre EN|grupo|material|principales|secundarios|u` (`src/data/catalog.ts`).

## Review Focus

- Ejercicio sin foto (custom o sin pareja): la ficha se ve bien, sin imagen rota ni hueco.
- Foto referenciada en el índice pero ausente en disco: lo detecta una prueba, no el usuario.
- Músculos de un ejercicio vacíos, repetidos entre principales y secundarios, o con id inexistente.
- Tema claro y oscuro: la tarjeta se lee en ambos.
- Peso de la app: las fotos no superan los 8 MB en total.

---

### Task 1: Prueba de integridad del catálogo

**Files:**
- Create: `tests/catalog.test.ts`

**Interfaces:**
- Consumes: `CATALOG` de `src/data/catalog.ts`, `MUSCLES` de `src/domain/muscles.ts`.
- Produces: nada.

- [ ] **Step 1: Escribir `tests/catalog.test.ts`** con cuatro pruebas sobre `CATALOG`: `ids únicos`; `todo ejercicio tiene al menos un músculo principal`; `principales y secundarios no se repiten en un mismo ejercicio`; `todos los músculos existen en MUSCLES`.
- [ ] **Step 2: Ejecutar** `npx vitest run tests/catalog.test.ts`. Si falla alguna, anota cuáles (son errores reales del catálogo) y corrígelas en la Task 3, no aquí.
- [ ] **Step 3: Commit** `Prueba de integridad del catálogo de ejercicios`.

### Task 2: Dataset y tabla de emparejado

**Files:**
- Create: `scripts/exercise-image-map.json` (`{ "<id de la app>": "<carpeta de la foto en el dataset>" }`)
- Create: `tests/exerciseImageMap.test.ts`

**Interfaces:**
- Consumes: `CATALOG`.
- Produces: `exercise-image-map.json`, usado por la Task 4.

- [ ] **Step 1: Descargar el dataset** a una carpeta temporal fuera del repo (`exercises.json` de `dist/` y la carpeta `exercises/` con las fotos del repo `yuhonas/free-exercise-db`).
- [ ] **Step 2: Emparejar** los 156 ejercicios: primero cruce automático por nombre en inglés normalizado (acierta ~83) y después a mano el resto. Abrir la foto de cada pareja dudosa para confirmar que es el mismo ejercicio. Los que no tengan pareja se omiten del JSON (quedan sin foto).
- [ ] **Step 3: Escribir `tests/exerciseImageMap.test.ts`**: `cada id del mapa existe en CATALOG`; `no hay dos ejercicios con la misma carpeta de foto` (salvo que sea intencionado y se liste en la prueba).
- [ ] **Step 4: Ejecutar** `npx vitest run tests/exerciseImageMap.test.ts` → PASS. Anotar cuántos ejercicios quedan sin pareja.
- [ ] **Step 5: Commit** `Tabla de emparejado ejercicio-foto`.

### Task 3: Auditoría de músculos

**Files:**
- Create: `scripts/audit-muscles.mjs`
- Create: `docs/superpowers/muscle-audit.md`
- Modify: `src/data/catalog.ts` (solo los músculos de las líneas que se corrijan)

**Interfaces:**
- Consumes: `exercises.json` del dataset (campos `primaryMuscles`, `secondaryMuscles`), `exercise-image-map.json`.
- Produces: informe de desacuerdos y catálogo corregido.

- [ ] **Step 1: Escribir `scripts/audit-muscles.mjs`** que, para cada ejercicio emparejado, traduce los músculos del dataset a `MuscleId` (tabla fija: `lats→lats`, `middle back→upper_back`, `lower back→lower_back`, `chest→chest_mid`, `shoulders→delt_front`, `traps→traps_upper`, `biceps`, `triceps`, `forearms→forearm`, `abdominals→abs`, `quadriceps→quads`, `hamstrings`, `glutes→glute_max`, `calves`, `adductors`, `abductors→glute_med`) e imprime solo los que difieren del catálogo (grupo, no id exacto en pecho y hombro, donde el dataset es menos fino).
- [ ] **Step 2: Ejecutarlo** y revisar cada desacuerdo con criterio anatómico (el dataset no es infalible). Ejemplo a respetar: remo → principales dorsales y espalda alta.
- [ ] **Step 3: Corregir** `src/data/catalog.ts` donde el catálogo esté equivocado, sin tocar ids.
- [ ] **Step 4: Escribir `docs/superpowers/muscle-audit.md`** con cada ejercicio corregido (antes → después) y los desacuerdos que se dejaron como estaban, con el motivo.
- [ ] **Step 5: Ejecutar** `npm test` → todo PASS (incluida la Task 1).
- [ ] **Step 6: Commit** `Auditoría y corrección de músculos del catálogo`.

### Task 4: Script de fotos e índice generado

**Files:**
- Create: `scripts/build-exercise-images.mjs`
- Create: `public/exercises/*.webp` (generadas)
- Create: `src/data/exerciseImages.ts` (generado)
- Create: `tests/exerciseImageFiles.test.ts`
- Modify: `package.json` (devDependency `sharp`, script `images:build`)

**Interfaces:**
- Consumes: `exercise-image-map.json`, carpeta del dataset (argumento `--src <ruta>`).
- Produces: `export const EXERCISE_IMAGE_IDS: ReadonlySet<string>` en `src/data/exerciseImages.ts`.

- [ ] **Step 1: Instalar** `npm install -D sharp`.
- [ ] **Step 2: Escribir `scripts/build-exercise-images.mjs`**: por cada entrada del mapa toma `<src>/exercises/<carpeta>/images/0.jpg`, la recorta a cuadrado, la reduce a 400 px, aplica el tinte oscuro (escala de grises + degradado a un azul pizarra muy oscuro, parámetros en constantes arriba del archivo) y guarda `public/exercises/<id>.webp` con calidad ~70. Al final reescribe `src/data/exerciseImages.ts` con la lista ordenada de ids que sí tienen foto y avisa si falta alguna foto de origen.
- [ ] **Step 3: Probar el tinte** con 3 variantes sobre 4 ejercicios distintos, ver los resultados y elegir uno con el usuario antes de generar todo.
- [ ] **Step 4: Escribir `tests/exerciseImageFiles.test.ts`**: `cada id de EXERCISE_IMAGE_IDS tiene su archivo en public/exercises`; `el total de public/exercises pesa menos de 8 MB`.
- [ ] **Step 5: Ejecutar** `npm run images:build -- --src <ruta>` y después `npx vitest run tests/exerciseImageFiles.test.ts` → PASS.
- [ ] **Step 6: Commit** `Fotos de ejercicios procesadas e índice generado`.

### Task 5: Tarjeta de imagen en la ficha del ejercicio

**Files:**
- Create: `src/lib/exerciseImage.ts`
- Create: `src/components/ExerciseImage.tsx`
- Create: `tests/exerciseImage.test.ts`
- Modify: `src/components/ExercisePicker.tsx` (`ExerciseDetail`, ~línea 149)
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `EXERCISE_IMAGE_IDS`.
- Produces: `exerciseImageUrl(id: string): string | null` y `<ExerciseImage exercise={Exercise} />`.

- [ ] **Step 1: Escribir `tests/exerciseImage.test.ts`**: `devuelve la ruta para un id con foto` (`exercises/bench_press.webp`, sin barra inicial) y `devuelve null para un id sin foto o custom`.
- [ ] **Step 2: Ejecutar** la prueba → FAIL (módulo no existe).
- [ ] **Step 3: Implementar `exerciseImageUrl`** en `src/lib/exerciseImage.ts` con `import.meta.env.BASE_URL` como prefijo (la app usa base `./`).
- [ ] **Step 4: Implementar `ExerciseImage`**: tarjeta oscura con `<img>` (`loading="lazy"`, `alt` con el nombre del ejercicio) y esquinas redondeadas; si `exerciseImageUrl` es null no renderiza nada.
- [ ] **Step 5: Insertar `<ExerciseImage>`** encima de `<MuscleSummary>` en `ExerciseDetail`; estilos en `src/styles.css` para tema claro y oscuro (la tarjeta sigue oscura en ambos).
- [ ] **Step 6: Ejecutar** `npm test` y `npm run typecheck` → PASS.
- [ ] **Step 7: Commit** `Tarjeta de imagen en la ficha del ejercicio`.

### Task 6: Miniatura en el selector

**Files:**
- Modify: `src/components/ExercisePicker.tsx` (fila de resultados)
- Modify: `src/components/ExerciseImage.tsx` (prop `size?: 'sm' | 'md'`)

**Interfaces:**
- Consumes: `<ExerciseImage>` de la Task 5.
- Produces: `size` en `ExerciseImage`.

- [ ] **Step 1: Añadir `size`** (`md` por defecto, `sm` = miniatura de 44 px) y mostrar la miniatura al inicio de cada fila del selector. Sin foto, la fila queda igual que ahora.
- [ ] **Step 2: Ejecutar** `npm test` y `npm run typecheck` → PASS.
- [ ] **Step 3: Commit** `Miniaturas de ejercicio en el selector`.

### Task 7: Ejercicios nuevos

**Files:**
- Modify: `src/data/catalog.ts` (líneas nuevas al final de `RAW`)
- Modify: `scripts/exercise-image-map.json`
- Regenerar: `public/exercises/`, `src/data/exerciseImages.ts`

**Interfaces:**
- Consumes: dataset y mapa de las tareas anteriores.
- Produces: unos 60–80 ejercicios nuevos con foto.

- [ ] **Step 1: Elegir** ejercicios habituales del dataset que no estén ya en el catálogo (por equipo y grupo, sin duplicar variantes casi idénticas). Redactar nombre ES y EN, grupo, material y músculos con la tabla de la Task 3, revisados con criterio anatómico.
- [ ] **Step 2: Mostrar la lista al usuario** (nombre ES, músculos) y esperar su visto bueno antes de añadirla.
- [ ] **Step 3: Añadir** las líneas al catálogo con ids nuevos en el formato actual, sumarlas al mapa y ejecutar `npm run images:build -- --src <ruta>`.
- [ ] **Step 4: Ejecutar** `npm test` → PASS (integridad, mapa y archivos).
- [ ] **Step 5: Commit** `Catálogo ampliado con ejercicios nuevos y fotos`.

### Task 8: Créditos, sincronización y prueba en el móvil

**Files:**
- Modify: `README.md` (sección de créditos y licencias)

**Interfaces:** ninguna.

- [ ] **Step 1: Añadir al README** la fuente de las fotos (`yuhonas/free-exercise-db`, Unlicense) junto a lo ya citado del mapa corporal (MIT).
- [ ] **Step 2: Ejecutar** `npm run android:sync` y comprobar que termina sin error.
- [ ] **Step 3: Prueba en el móvil** (OPPO A94): abrir la ficha de un remo, un press de banca y un ejercicio sin foto. Comprobar que los músculos resaltados son los correctos, que se ve bien en tema claro y oscuro y que la app abre igual de rápido.
- [ ] **Step 4: Commit** `Créditos de las imágenes de ejercicios`.

---

## Autorrevisión

- **Cobertura del diseño:** tarjeta oscura con foto y muñeco (T4, T5), principales y secundarios en color (ya lo hace `MuscleSummary`), músculos correctos (T1, T3), sin conexión (T4), catálogo ampliado (T7), sin foto no rompe (T5, Review Focus), créditos (T8). El nombre y los músculos en letra pequeña ya los muestra `MuscleSummary` en `muscle-list`.
- **Consistencia de tipos:** `exerciseImageUrl` y `EXERCISE_IMAGE_IDS` se definen en T4/T5 y se usan igual en T6.
- **Hueco asumido:** el tinte exacto se decide con fotos reales en T4 Step 3.
