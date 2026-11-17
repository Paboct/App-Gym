# Catálogo con coeficientes · Parte 1: datos — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Producir `data/catalogo/ejercicios.json`: los 240 ejercicios actuales en el formato de 35 músculos con coeficiente de activación, validado, con textos en español e inglés.

**Architecture:** Un validador puro en TypeScript (`src/domain/catalogValidation.ts`) fija las reglas del formato y se prueba con Vitest, también contra el JSON real. Los datos se generan por grupo muscular en lotes (`data/catalogo/lotes/<grupo>.json`) —pensados para repartirse entre subagentes en paralelo— y un script los une. Esta parte **no toca la app**: `src/data/catalog.ts` sigue igual hasta la parte 2.

**Tech Stack:** TypeScript, Vitest, Node (scripts `.mjs`), JSON.

**Spec:** `docs/superpowers/specs/2026-11-17-catalogo-activacion-design.md`

## Global Constraints

- Los **240 `id` actuales** de `src/data/catalog.ts` se conservan tal cual (los entrenos guardados y `public/exercises/<id>.webp` apuntan a ellos). Ningún id nuevo sin imagen asociada se inventa: solo se añaden ejercicios si el usuario lo pide.
- 35 músculos exactos: los ids de `catalogo_musculos` de `C:\Users\ruizm\Downloads\ejercicios.json`.
- Idiomas: español e inglés en `nombre`, `descripcion`, `patron_movimiento`.
- Fuentes permitidas: `free-exercise-db` (dominio público), `wger` (CC-BY-SA, **solo referencia factual**, textos reescritos), literatura de EMG. **Prohibido** copiar o raspar Symmetry. Todo texto de descripción es redacción propia.
- Los coeficientes son **estimaciones**; cada ejercicio lleva `confianza`: `alta` (literatura), `media` (híbrido), `baja` (solo analogía). La literatura manda sobre Gemini cuando discrepan.
- 12 grupos de la app (`GroupId`): chest, back, shoulders, biceps, triceps, forearms, core, glutes, quads, hamstrings, adductors, calves. Los 7 de Gemini se descartan.
- Roles: `principal`, `secundario`, `estabilizador` (Gemini usa los tres).
- Commits en español, terminando con `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Los archivos son CRLF en Windows; el aviso de git es normal.
- Comandos: `npm test`, `npm run typecheck`.

## Review Focus

- Un `id` actual del catálogo que desaparezca o cambie al regenerar (rompe entrenos guardados): la validación falla si falta alguno.
- Músculos con id inventado o con tilde/mayúsculas distintas (`Pectoral_esternal`): se rechaza.
- Ejercicio sin ningún músculo `principal`, o con `activacion` fuera de (0, 1].
- Descripción vacía o idéntica en es y en (señal de que no se tradujo).
- Ejercicio unilateral que pierde su marca `unilateral` respecto al catálogo actual.

## Estructura de archivos

| Archivo | Responsabilidad |
| --- | --- |
| `data/catalogo/gemini-ejercicios.json` | Copia de partida (45 ejercicios + `catalogo_musculos`). Solo lectura. |
| `data/catalogo/musculos.json` | Los 35 músculos: `{ id, nombre_es, nombre_en, grupo }` (grupo = `GroupId`). |
| `src/domain/catalogSchema.ts` | Tipos del formato: `CatalogExerciseData`, `MuscleRole`, `Confidence`. |
| `src/domain/catalogValidation.ts` | `validateCatalog(data, opts): string[]` — lista de errores (vacía = válido). |
| `tests/catalogValidation.test.ts` | Pruebas del validador con casos pequeños. |
| `tests/catalogData.test.ts` | Valida el JSON real (`ejercicios.json`) con el validador. |
| `scripts/catalogo/emparejar.mjs` | Empareja los 45 de Gemini con ids de la app por nombre; escribe `emparejamiento.json`. |
| `scripts/catalogo/prompt-lote.md` | Instrucciones fijas para cada subagente generador (un grupo). |
| `scripts/catalogo/unir.mjs` | Une `lotes/*.json` en `ejercicios.json` y comprueba que están todos los ids. |
| `scripts/catalogo/informe.mjs` | Genera `informe-revision.md` con los de confianza `baja` y discrepancias. |
| `data/catalogo/lotes/<grupo>.json` | Salida por grupo (12 archivos). |
| `data/catalogo/ejercicios.json` | Resultado final. |

## Formato final (`CatalogExerciseData`)

```ts
type MuscleRole = 'principal' | 'secundario' | 'estabilizador';
type Confidence = 'alta' | 'media' | 'baja';
interface CatalogExerciseData {
  id: string;                       // id actual de la app, p. ej. "bench_press"
  nombre: string; nombre_en: string;
  grupo: GroupId;                   // uno de los 12 de la app
  equipamiento: EquipmentId;        // barbell|dumbbell|machine|cable|smith|bodyweight|other
  unilateral: boolean;
  patron_movimiento: string; patron_movimiento_en: string;
  mecanica: 'Compuesto' | 'Aislamiento' | 'Isométrico';
  musculos: { musculo_id: string; rol: MuscleRole; activacion: number }[];
  descripcion: string; descripcion_en: string;
  confianza: Confidence;
  fuentes: string[];                // URLs o citas cortas; [] solo si confianza = "baja"
}
interface CatalogFile { version: string; ejercicios: CatalogExerciseData[] }
```

---

### Task 1: Formato y validador

**Files:**
- Create: `src/domain/catalogSchema.ts`, `src/domain/catalogValidation.ts`
- Create: `data/catalogo/gemini-ejercicios.json` (copia de `C:\Users\ruizm\Downloads\ejercicios.json`), `data/catalogo/musculos.json`
- Test: `tests/catalogValidation.test.ts`

**Interfaces:**
- Produces: tipos `CatalogExerciseData`, `CatalogFile`, `MuscleRole`, `Confidence` (de `catalogSchema.ts`); `validateCatalog(file: CatalogFile, opts: { muscleIds: string[]; requiredIds: string[] }): string[]`. Cada error es una frase que empieza por el `id` del ejercicio (`"bench_press: …"`).

- [ ] **Step 1: Escribir los tests que fallan** en `tests/catalogValidation.test.ts` con un ejercicio válido mínimo de ejemplo y un caso por regla. Reglas y su comprobación:
  - `musculo_id` no incluido en `opts.muscleIds` → error que contiene `"músculo desconocido"`.
  - sin ningún `rol: 'principal'` → error `"sin músculo principal"`.
  - algún `principal` con `activacion < 0.8` → error `"principal por debajo de 0,8"`.
  - `activacion <= 0` o `> 1` → error `"activación fuera de rango"`.
  - mismo `musculo_id` dos veces en un ejercicio → error `"músculo repetido"`.
  - `max(activacion) < 0.85` → error `"ninguna activación ≥ 0,85"`.
  - `descripcion` o `descripcion_en` vacía, o `descripcion === descripcion_en` → error `"descripción"`.
  - `nombre_en` vacío → error `"nombre_en"`.
  - `confianza` distinta de alta/media/baja → error `"confianza"`; `fuentes: []` con confianza ≠ `baja` → error `"fuentes"`.
  - `id` duplicado en el archivo → error `"id duplicado"`.
  - algún `opts.requiredIds` ausente → error `"falta el id"`.
  - `grupo`/`equipamiento` fuera de los permitidos → error `"grupo"` / `"equipamiento"`.
  - Un archivo válido devuelve `[]`.
- [ ] **Step 2: Ejecutar** `npx vitest run tests/catalogValidation.test.ts` — Esperado: FALLA (módulo no existe).
- [ ] **Step 3: Implementar** `catalogSchema.ts` (tipos de arriba, importando `GroupId`/`EquipmentId` de `src/domain/muscles.ts`) y `validateCatalog` en `catalogValidation.ts`. Función pura, sin E/S; recorre todos los ejercicios y acumula errores.
- [ ] **Step 4: Crear** `data/catalogo/gemini-ejercicios.json` (copia exacta) y `data/catalogo/musculos.json` con los 35 músculos: `id` y `nombre_es` salen de `catalogo_musculos` de Gemini, `nombre_en` se redacta, `grupo` sigue la tabla 35→12 del apartado «Tabla 35 → 12 grupos» de la spec.
- [ ] **Step 5: Ejecutar** `npx vitest run tests/catalogValidation.test.ts` y `npm run typecheck` — Esperado: PASS.
- [ ] **Step 6: Commit** — `git add src/domain/catalogSchema.ts src/domain/catalogValidation.ts tests/catalogValidation.test.ts data/catalogo` · «Formato del catálogo con activación y su validador».

---

### Task 2: Emparejar los 45 de Gemini con los ids de la app

**Files:**
- Create: `scripts/catalogo/emparejar.mjs`, `data/catalogo/emparejamiento.json`

**Interfaces:**
- Consumes: `data/catalogo/gemini-ejercicios.json`; ids y nombres de `src/data/catalog.ts` (se leen del texto RAW, como hace `scripts/audit-muscles.mjs`).
- Produces: `emparejamiento.json` = `{ [idGemini: string]: { appId: string | null; motivo: string } }`.

- [ ] **Step 1: Implementar** `emparejar.mjs`: normaliza (minúsculas, sin tildes, sin signos) `nombre` de Gemini y `nombreEs` del catálogo; empareja por igualdad y, si no, por mayor solapamiento de palabras (≥ 0,8); el resto queda `appId: null` con `motivo`.
- [ ] **Step 2: Ejecutar** `node scripts/catalogo/emparejar.mjs` — Esperado: imprime cuántos de 45 quedaron emparejados y la lista de los dudosos (solapamiento < 1).
- [ ] **Step 3: Revisión humana:** mostrar al usuario la tabla `idGemini → appId` de los dudosos y de los `null`; aplicar sus correcciones en `emparejamiento.json` (a mano). El `appId` siempre es un id existente del catálogo actual.
- [ ] **Step 4: Commit** — «Emparejamiento de los ejercicios de Gemini con el catálogo».

---

### Task 3: Generar los datos por grupo (paralelizable)

**Files:**
- Create: `scripts/catalogo/prompt-lote.md`, `data/catalogo/lotes/<grupo>.json` ×12 (`chest, back, shoulders, biceps, triceps, forearms, core, glutes, quads, hamstrings, adductors, calves`)

**Interfaces:**
- Consumes: `CatalogExerciseData` (formato final), `musculos.json`, `gemini-ejercicios.json`, `emparejamiento.json`, ids/nombres/músculos antiguos de `src/data/catalog.ts` filtrados por `group`.
- Produces: cada `lotes/<grupo>.json` = `CatalogFile` con exactamente los ejercicios de ese `group` del catálogo actual, mismos `id`.

- [ ] **Step 1: Escribir** `prompt-lote.md` con las instrucciones fijas para el subagente (una sesión por grupo): entradas que debe leer; salida exacta; reglas de calidad de los coeficientes (**literatura primero**, `confianza: alta`; si no hay, analogía con ejercicios parecidos y los de Gemini, `media` o `baja`; la literatura manda sobre Gemini si discrepan; anotar la fuente en `fuentes`); verificar la lista de músculos contra `free-exercise-db` (clonar con `git clone https://github.com/yuhonas/free-exercise-db` en un directorio **fuera del repo**); descripciones y patrón en es/en de redacción propia (3–4 frases, técnica y errores típicos, sin copiar texto de ninguna web); `unilateral` heredado del catálogo actual; no usar Symmetry; los 35 músculos del catálogo y los tres roles; principal ≥ 0,8.
- [ ] **Step 2: Lanzar 12 subagentes en paralelo** (uno por grupo, con el contenido de `prompt-lote.md` y su grupo). Cada uno escribe su `lotes/<grupo>.json` y ejecuta, sobre su archivo, la validación del Task 4 (Step 3) hasta que dé `[]`.
- [ ] **Step 3: Comprobar** que existen los 12 archivos y que cada uno contiene tantos ejercicios como ids hay de ese grupo en `catalog.ts`.
- [ ] **Step 4: Commit** — «Datos del catálogo por grupo muscular (lotes)».

---

### Task 4: Unir, validar y fijar con tests

**Files:**
- Create: `scripts/catalogo/unir.mjs`, `data/catalogo/ejercicios.json`, `tests/catalogData.test.ts`

**Interfaces:**
- Consumes: `lotes/*.json`, `validateCatalog`, `musculos.json`, `CATALOG` de `src/data/catalog.ts`.
- Produces: `data/catalogo/ejercicios.json` (`CatalogFile` con los 240 ejercicios, ordenados como en `CATALOG`).

- [ ] **Step 1: Escribir el test que falla** `tests/catalogData.test.ts`: carga `data/catalogo/ejercicios.json` y comprueba (a) `validateCatalog(file, { muscleIds: <ids de musculos.json>, requiredIds: CATALOG.map(e => e.id) })` es `[]`; (b) hay exactamente 240 ejercicios; (c) para cada ejercicio de `CATALOG` con `unilateral: true`, el del JSON tiene `unilateral: true` y viceversa; (d) el `grupo` coincide con `group` de `CATALOG`; (e) ningún `fuentes` menciona «symmetry» (sin distinguir mayúsculas).
- [ ] **Step 2: Ejecutar** `npx vitest run tests/catalogData.test.ts` — Esperado: FALLA (no existe `ejercicios.json`).
- [ ] **Step 3: Implementar** `unir.mjs`: lee `lotes/*.json`, concatena en el orden de `CATALOG`, escribe `ejercicios.json` (`version: "1.0.0"`) y falla con la lista si falta algún id o sobra alguno.
- [ ] **Step 4: Ejecutar** `node scripts/catalogo/unir.mjs` y luego `npx vitest run tests/catalogData.test.ts` — Esperado: PASS. Si hay errores, devolver el lote afectado al subagente del Task 3 (SendMessage) con el error exacto.
- [ ] **Step 5: Commit** — «Catálogo unificado de 240 ejercicios con activación».

---

### Task 5: Informe de revisión para el usuario

**Files:**
- Create: `scripts/catalogo/informe.mjs`, `data/catalogo/informe-revision.md`

**Interfaces:**
- Consumes: `ejercicios.json`, `gemini-ejercicios.json`, `emparejamiento.json`.
- Produces: `informe-revision.md` con tres secciones: (1) ejercicios con `confianza: baja` (id, nombre, músculos principales y coeficientes); (2) discrepancias con Gemini en el mismo ejercicio (músculo con diferencia de activación > 0,2 o rol distinto); (3) recuento por confianza (alta/media/baja).

- [ ] **Step 1: Implementar** `informe.mjs` y ejecutarlo: `node scripts/catalogo/informe.mjs`.
- [ ] **Step 2: Mostrar al usuario** el recuento y las secciones 1–2 y recoger sus correcciones; aplicarlas en el lote correspondiente, volver a ejecutar `unir.mjs` y `npx vitest run tests/catalogData.test.ts`.
- [ ] **Step 3: Verificación final:** `npm test` y `npm run typecheck` — Esperado: todo en verde (118 tests anteriores + los nuevos).
- [ ] **Step 4: Commit** — «Informe de revisión del catálogo».
