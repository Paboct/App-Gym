# Comparar mesociclos y microciclos — plan de implementación

> **Para agentes:** SUB-HABILIDAD OBLIGATORIA: usar superpowers:subagent-driven-development (recomendada) o superpowers:executing-plans para ejecutar este plan tarea a tarea. Los pasos usan casillas `- [ ]`.

**Objetivo:** pantalla de comparación con dos modos: dos mesociclos (récords, puntuación por grupo, ejercicios en común con gráfica) y dos microciclos de un mesociclo (gráfica carga × repeticiones por serie de un ejercicio).

**Arquitectura:** la lógica es función pura en `src/domain/compare.ts` (probada con vitest, como `kpi.ts`); un componente SVG multi-línea nuevo pinta las gráficas; `CompareScreen` lee Dexie con `useLiveQuery` y solo coordina. Sin cambios de esquema ni de nube.

**Tecnologías:** React + TypeScript + Vite, Dexie, vitest, SVG a mano (sin librerías de gráficas).

**Spec:** `docs/superpowers/specs/2026-11-18-comparar-mesociclos-design.md`

## Restricciones globales

- Idioma de trabajo y de la interfaz: español; todo texto nuevo lleva su clave en `es` y en `en` (`src/i18n/strings.ts`; `en` es `Record<StringKey, string>`, el typecheck falla si falta una).
- Solo cuentan series de trabajo hechas con peso y repeticiones (`countsForMetrics` de `src/domain/calc.ts`; `groupByWorkout` ya filtra `kind === 'work' && done`).
- Carga de un ejercicio = mejor 1RM estimado (`setE1rm`); las cargas se muestran con `formatWeight(v, unit, lang)`.
- Se compara la puntuación numérica de `groupScore`, nunca el nombre del rango.
- Commits en español con el `Co-Authored-By` indicado por el sistema. Windows: avisos CRLF normales.
- Comandos: `npm test`, `npm run typecheck`.

## Review Focus

Entradas que el diseño no nombra y que pueden romper la pantalla; cada una tiene su prueba en la tarea indicada.

1. Elegir el mismo mesociclo en A y en B → la pantalla pide dos distintos, sin cifras de diferencia (Tarea 3).
2. Ejercicio con serie sin peso (`weight: null`) o sin repeticiones → se ignora, no produce `NaN` en la gráfica (Tarea 2).
3. Ejercicio con 1RM 0 en uno de los mesociclos → no es «en común» y nunca se divide entre 0 (Tarea 1).
4. Mesociclo sin ningún entreno hecho → no se ofrece en los desplegables; con menos de dos válidos, el botón «Comparar» no aparece (Tarea 1, `pickDefaultPair`, y Tarea 3).
5. Microciclo con distinto número de series que el otro → línea más corta, sin rellenar (Tarea 2).

---

### Tarea 1: Lógica de comparación de mesociclos

**Archivos:**
- Crear: `src/domain/compare.ts`
- Modificar: `src/domain/kpi.ts` (exportar `bestE1rmByMicro`, hoy privada, línea ~146)
- Probar: `tests/compare.test.ts` (reutilizar los ayudantes `workout()` y `set()` y el estilo de `tests/kpi.test.ts`)

**Interfaces:**
- Consume: `groupByWorkout`, `groupScore`, `recordStats`, `volumeByMicro`, `bestE1rmByMicro`, `ScoreContext`, `WorkoutSets`, `SeriesPoint` de `kpi.ts`; `GROUPS`, `GroupId` de `muscles.ts`; `Mesocycle`, `Exercise`, `PrRecord` de `types.ts`.
- Produce, en `compare.ts`:
  - `interface CompareInput { data: WorkoutSets[]; exercises: Map<string, Exercise>; prs: PrRecord[]; bodyWeightKg: number | null }` (`data` es el resultado de `groupByWorkout` de TODOS los entrenos).
  - `interface MesoComparison { records: { a: number; b: number }; groups: { group: GroupId; a: number | null; b: number | null }[]; common: { exerciseId: string; a: number; b: number; changePct: number }[] }`
  - `compareMesocycles(a: Mesocycle, b: Mesocycle, input: CompareInput): MesoComparison`
  - `pickDefaultPair(mesos: Mesocycle[], data: WorkoutSets[]): { a: Mesocycle; b: Mesocycle } | null` — entre los mesociclos con al menos un entreno hecho, B = el de `createdAt` más reciente y A = el siguiente; `null` si hay menos de dos.
  - `microSeries(exerciseId: string, meso: Mesocycle, data: WorkoutSets[], metric: 'e1rm' | 'volume'): SeriesPoint[]` — por microciclo (`key` = nº, `label` = `S${n}`); `volume` delega en `volumeByMicro`; `e1rm` usa `bestE1rmByMicro` y recorta los microciclos finales sin datos igual que `volumeByMicro` (mínimo 1 punto).

- [ ] **Paso 1: escribir las pruebas que fallan** en `tests/compare.test.ts`, con estos casos (nombre → aserciones):
  - «récords: cuenta los PR de cada mesociclo» → con 2 PR de `m1` y 3 de `m2`, `records` = `{ a: 2, b: 3 }`.
  - «grupos: puntuación en cada lado y null si falta» → pecho con datos en `m1` y `m2` da `a` y `b` numéricos; un grupo con datos solo en `m2` da `a: null`; un grupo sin datos en ninguno no aparece en `groups`.
  - «comunes: solo ejercicios con 1RM > 0 en ambos» → `bench_press` en los dos y `squat` solo en `m1`: `common` tiene solo `bench_press`; `changePct` = `(b − a) / a × 100`.
  - «comunes: orden por cambio absoluto, mayor primero» → con +20 % y −30 %, el −30 % va primero.
  - «serie sin peso o sin repeticiones no cuenta» (Review Focus 2) → una serie `weight: null` y otra `reps: 0` no crean ejercicio común ni dan `NaN`.
  - «pickDefaultPair: B es el más reciente con entrenos y A el anterior» → 3 mesociclos, el más nuevo sin entrenos: devuelve los dos que sí tienen; con un solo mesociclo válido devuelve `null` (Review Focus 4).
  - «microSeries e1rm: recorta los microciclos finales sin datos y deja los huecos intermedios» → datos en S1 y S3 de un meso de 6: 3 puntos, el de S2 con `value: 0`.
- [ ] **Paso 2: ejecutar y comprobar que fallan.** `npx vitest run tests/compare.test.ts` → FALLA (módulo `compare` inexistente).
- [ ] **Paso 3: implementar** `compare.ts` y exportar `bestE1rmByMicro` en `kpi.ts`. Para cada mesociclo: filtrar `data` por `workout.mesocycleId`, construir un `ScoreContext` con `weeks` = microciclos distintos con datos (mínimo 1), `meso` = ese mesociclo y `groupScore` por cada `GROUPS`. «Mejor 1RM» de un ejercicio en un mesociclo = máximo de los valores de `bestE1rmByMicro`.
- [ ] **Paso 4: ejecutar y comprobar que pasan.** `npx vitest run tests/compare.test.ts` y `npm run typecheck` → PASA.
- [ ] **Paso 5: commit** — «Lógica pura para comparar dos mesociclos».

---

### Tarea 2: Lógica de comparación de microciclos

**Archivos:**
- Modificar: `src/domain/compare.ts`
- Probar: `tests/compare.test.ts`

**Interfaces:**
- Consume: `WorkoutSets`, `countsForMetrics`.
- Produce, en `compare.ts`:
  - `interface SetPoint { n: number; weight: number; reps: number }`
  - `microSets(exerciseId: string, mesocycleId: string, micro: number, data: WorkoutSets[]): SetPoint[]` — series de ese ejercicio en ese microciclo, solo las que cumplen `countsForMetrics`; entrenos por orden cronológico (ya vienen ordenados de `groupByWorkout`) y, dentro de cada entreno, por `index`; `n` empieza en 1 y sigue correlativo entre días de la misma semana.
  - `exercisesWithTwoMicros(mesocycleId: string, data: WorkoutSets[]): Map<string, number[]>` — por ejercicio, los microciclos (ordenados) donde tiene series válidas; solo los ejercicios con al menos 2.

- [ ] **Paso 1: escribir las pruebas que fallan:**
  - «numera las series seguidas entre días de la misma semana» → dos entrenos del micro 2 con 3 y 2 series: `n` = 1..5 en orden de fecha.
  - «ordena por index dentro del entreno» → series insertadas desordenadas salen ordenadas.
  - «ignora series sin peso, sin repeticiones y las de aproximación» (Review Focus 2) → no aparecen.
  - «microciclos con distinto nº de series» (Review Focus 5) → `microSets` de uno devuelve 4 puntos y el otro 2, sin relleno.
  - «exercisesWithTwoMicros: solo ejercicios con ≥ 2 microciclos y solo del mesociclo pedido» → un ejercicio en micros 1 y 3 → `[1, 3]`; uno solo en el micro 1 no aparece; datos de otro mesociclo no cuentan.
- [ ] **Paso 2: ejecutar y comprobar que fallan.** → FALLA.
- [ ] **Paso 3: implementar** ambas funciones en `compare.ts`.
- [ ] **Paso 4: ejecutar y comprobar que pasan.** `npx vitest run tests/compare.test.ts` y `npm run typecheck` → PASA.
- [ ] **Paso 5: commit** — «Series por microciclo para comparar dos semanas de un ejercicio».

---

### Tarea 3: Gráfica multi-línea, pantalla y entrada

**Archivos:**
- Crear: `src/components/CompareChart.tsx`, `src/screens/CompareScreen.tsx`
- Modificar: `src/App.tsx` (ruta `/kpis/compare`, junto a la de `/kpis`), `src/screens/KpiScreen.tsx` (botón «Comparar» sobre los chips de ámbito), `src/i18n/strings.ts` (claves en `es` y `en`), `src/styles.css` solo si hace falta (existen `.segmented`, `.chips`, `.card`, `.input`).

**Interfaces:**
- Consume: todo lo producido en las Tareas 1 y 2; `LineChart.tsx` como referencia visual (mismas constantes `W`, `PAD_*`, colores `var(--red)`, `var(--gold)`, `var(--faint)`, `var(--line)`).
- Produce:
  - `interface CompareSeries { label: string; color: string; points: { x: number; y: number; tag?: string }[] }`
  - `CompareChart(props: { series: CompareSeries[]; xLabel?: (x: number) => string; format?: (y: number) => string; height?: number }): JSX.Element` — líneas con puntos, un color por serie, eje X con las posiciones enteras presentes, valor máximo arriba a la izquierda y `tag` (p. ej. «80 kg × 8») sobre cada punto cuando la serie tiene como máximo 8 puntos; leyenda con el `label` de cada serie.
  - Ruta `/kpis/compare` → `<CompareScreen />`.

**Comportamiento de `CompareScreen`** (todo según el spec):
- Lee con `useLiveQuery` los entrenos, series, ejercicios, PR, mesociclos y el último peso corporal (misma consulta que `KpiScreen`), y usa `groupByWorkout`.
- Selector `.segmented` «Mesociclos | Microciclos».
- **Modo Mesociclos:** dos `<select>` (A y B) con los mesociclos que tienen entrenos hechos, inicializados con `pickDefaultPair`. Si A = B: texto «Elige dos mesociclos distintos» y nada más (Review Focus 1). Si no: bloque Récords (valor A, valor B, ▲/▼ con la diferencia), bloque Puntuación por grupo (nombre con `GROUP_NAMES`; «—» y «solo A»/«solo B» cuando falta un lado), bloque Ejercicios en común (nombre, 1RM de A, 1RM de B, % con ▲ verde / ▼ rojo; sin ninguno: «No hay ejercicios en común»). Al tocar una fila se despliega `CompareChart` con `microSeries` de A y de B (x = nº de microciclo) y un selector «1RM / Volumen».
- **Modo Microciclos:** `<select>` de mesociclo (por defecto el `status === 'active'`; si no hay, el más reciente con entrenos), `<select>` de ejercicio con las claves de `exercisesWithTwoMicros`, y dos `<select>` de microciclo (A, B) con los microciclos de ese ejercicio, por defecto los dos últimos. Un único `CompareChart` con una serie por microciclo (`microSets`: x = `n`, y = `weight`, `tag` = `${formatWeight(weight, unit, lang)} × ${reps}`). Sin ejercicios válidos: «Hacen falta al menos dos microciclos con ese ejercicio».
- Botón «Comparar» en `KpiScreen`: `Link` a `/kpis/compare`, visible solo si `pickDefaultPair(data.mesos, byWorkout)` no es `null` (Review Focus 4).
- Claves nuevas (nombres libres, pero con texto en los dos idiomas): título, «Mesociclos», «Microciclos», «Comparar», «Elige dos mesociclos distintos», «No hay ejercicios en común», «Solo en A», «Solo en B», «1RM», «Volumen», «Hacen falta al menos dos microciclos con ese ejercicio», «Serie».

- [ ] **Paso 1: añadir las claves de texto** en `es` y en `en`; `npm run typecheck` PASA.
- [ ] **Paso 2: crear `CompareChart.tsx`** con la firma de arriba (componente de presentación, sin lógica de datos).
- [ ] **Paso 3: crear `CompareScreen.tsx`**, la ruta en `App.tsx` y el botón en `KpiScreen.tsx` con el comportamiento descrito.
- [ ] **Paso 4: verificación automática.** `npm test` (todo PASA, incluido `compare.test.ts`), `npm run typecheck` y `npm run build` PASAN.
- [ ] **Paso 5: prueba manual en el navegador** (`npm run dev`, con datos reales o creando dos mesociclos con entrenos): botón «Comparar» visible en KPIs; modo Mesociclos con las tres tablas y la gráfica al tocar un ejercicio; A = B muestra el aviso; modo Microciclos con la gráfica de dos colores y las etiquetas «kg × reps»; cambiar kg/lb en Perfil cambia las cifras. Revisar también a ancho de móvil (≈ 390 px).
- [ ] **Paso 6: commit** — «Pantalla para comparar dos mesociclos o dos microciclos».

---

### Tarea 4: Documentación y cierre

**Archivos:**
- Modificar: `docs/ESPECIFICACION.md` (quitar «Comparar dos mesociclos» de Pendiente y describir la función en el estado), `CLAUDE.md` (la línea «solo falta comparar dos mesociclos y afinar los umbrales» pasa a «solo falta afinar los umbrales de rango»).

- [ ] **Paso 1:** actualizar ambos documentos.
- [ ] **Paso 2: verificación final.** `npm test`, `npm run typecheck`, `npm run build` PASAN.
- [ ] **Paso 3: commit** — «Documentación de la comparación de mesociclos y microciclos».
- [ ] **Paso 4:** fusionar `comparar-mesociclos` en `main` y, si se quiere probar en el móvil, `npm run android:sync` (ambas cosas las decide el usuario).
