# Exportar un mesociclo a Excel — plan de implementación

> **Para quien lo ejecute:** usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans. Los pasos usan casillas `- [ ]`.

**Goal:** Un botón "Exportar a Excel" en cada mesociclo que genera un `.xlsx` (Rutina, Entrenos, Progreso con gráficas) y lo comparte desde Android.

**Architecture:** Funciones puras convierten los datos del mesociclo en filas; un generador con ExcelJS construye las hojas; un módulo añade las gráficas de Excel al zip resultante; un módulo guarda y comparte el archivo (Capacitor en el móvil, descarga en navegador).

**Tech Stack:** React 19, Dexie, Vitest (entorno node), Capacitor 8, `exceljs`, `@capacitor/filesystem`, `@capacitor/share`.

**Spec:** `docs/superpowers/specs/2026-11-16-excel-export-design.md`

## Global Constraints

- Solo entrenos con `status === 'done'`.
- Pesos en la unidad elegida por el usuario (`kg` o `lb`) usando `kgToUnit`/`roundForDisplay` de `src/domain/calc.ts`; la columna indica la unidad en su encabezado.
- Volumen y 1RM solo con series que cuentan (`countsForMetrics`, `setVolume`, `setE1rm`); las de aproximación y las bajadas del dropset nunca suman volumen.
- Encabezados e idioma de las hojas según `lang` (`es` | `en`).
- Sin datos personales en el archivo (ni correo ni ids de cuenta).
- Nombre de archivo: `<nombre del mesociclo>.xlsx` sin los caracteres `\ / : * ? " < > |`.
- Funciona sin conexión; el archivo no se envía a ningún servidor.
- Si añadir las gráficas falla, el archivo se entrega igualmente sin ellas.

## Review Focus

- Mesociclo sin ningún entreno hecho: el archivo se genera, con la hoja Rutina completa y Entrenos/Progreso vacías, sin errores.
- Nombre del mesociclo con caracteres no válidos o muy largo (más de 80 caracteres): el nombre de archivo y los nombres de hoja son válidos (Excel limita las hojas a 31 caracteres).
- Ejercicio sin peso (peso corporal) o con peso `null`: no rompe la hoja ni produce `NaN`; la celda queda vacía.
- Ejercicio sustituido en un microciclo (`exerciseByMicro`): el progreso se calcula por el ejercicio realmente hecho, no por el planificado.
- Dropset con 1 a 3 bajadas: se escriben todas, en el orden en que se hicieron, como `peso×reps + peso×reps`.

---

### Task 1: Datos del archivo (funciones puras)

**Files:**
- Create: `src/domain/exportRows.ts`
- Test: `tests/exportRows.test.ts`

**Interfaces:**
- Consumes: tipos de `src/domain/types.ts`; `kgToUnit`, `roundForDisplay`, `setVolume`, `setE1rm`, `countsForMetrics`, `rirLabel` de `src/domain/calc.ts`.
- Produces:
  - `interface ExportInput { meso: Mesocycle; days: RoutineDay[]; planned: PlannedExercise[]; workouts: Workout[]; workoutExercises: WorkoutExercise[]; sets: SetLog[]; exercises: Map<string, Exercise>; unit: Unit; lang: 'es' | 'en' }`
  - `interface RoutineRow { day: number; dayName: string; exercise: string; sets: number; reps: string; rir: number | null; restSec: number; notes: string }`
  - `interface SetRow { micro: number; day: string; date: string; exercise: string; kind: 'warmup' | 'work'; setNo: number; weight: number | null; reps: number | null; rir: number | null; drops: string; volume: number }`
  - `interface ProgressRow { exerciseId: string; exercise: string; micro: number; maxWeight: number; e1rm: number; volume: number; sets: number }`
  - `buildRoutineRows(input: ExportInput): RoutineRow[]`, `buildSetRows(input: ExportInput): SetRow[]`, `buildProgressRows(input: ExportInput): ProgressRow[]`, `sanitizeFileName(name: string): string`.

- [ ] **Step 1: Escribir `tests/exportRows.test.ts`** con datos inventados que prueben: `buildRoutineRows` devuelve `reps` como `"6–8"` y respeta `setsByMicro` ignorándolo (usa las series base); `buildSetRows` ignora entrenos `in_progress` y series no hechas, escribe el dropset `"60×8 + 45×10"` y devuelve `volume` 0 para las de aproximación; `buildProgressRows` usa `exerciseId` de la serie (ejercicio sustituido) y calcula `maxWeight`, `e1rm`, `volume` y `sets` (solo efectivas) por microciclo; peso `null` no produce `NaN`; mesociclo sin entrenos devuelve `[]` en sets y progreso; `sanitizeFileName('A/B:C?')` → `'A B C'` sin espacios dobles y recortado a 80 caracteres, y un nombre vacío → `'mesociclo'`.
- [ ] **Step 2: Ejecutar** `npx vitest run tests/exportRows.test.ts` → FAIL (módulo no existe).
- [ ] **Step 3: Implementar** las cuatro funciones en `src/domain/exportRows.ts` con las firmas de Interfaces. Pesos y 1RM ya convertidos a la unidad de `input.unit` y redondeados con `roundForDisplay`; filas de series ordenadas por microciclo, orden del día, orden del ejercicio y `index`; progreso ordenado por ejercicio y microciclo.
- [ ] **Step 4: Ejecutar** `npx vitest run tests/exportRows.test.ts` → PASS.
- [ ] **Step 5: Commit** `Datos de la exportación a Excel`.

### Task 2: Libro de Excel con las hojas

**Files:**
- Create: `src/lib/xlsx/buildWorkbook.ts`
- Create: `src/lib/xlsx/labels.ts`
- Test: `tests/buildWorkbook.test.ts`
- Modify: `package.json` (dependencia `exceljs`)

**Interfaces:**
- Consumes: `ExportInput`, `RoutineRow`, `SetRow`, `ProgressRow` y `build*Rows` de la Task 1.
- Produces:
  - `labels(lang: 'es' | 'en'): ExportLabels` con los textos de encabezados y hojas.
  - `buildWorkbook(input: ExportInput): Promise<Uint8Array>` — libro con hojas `Rutina`, `Entrenos`, `Datos` y `Progreso` (nombres traducidos, ≤ 31 caracteres).

- [ ] **Step 1: Instalar** `npm install exceljs`.
- [ ] **Step 2: Escribir `tests/buildWorkbook.test.ts`**: genera un libro con datos inventados, lo relee con `ExcelJS.Workbook().xlsx.load(...)` y comprueba: existen las cuatro hojas; la fila de encabezados de `Entrenos` tiene los textos de `labels`; `Entrenos` contiene una fila por serie hecha y la de dropset tiene `"60×8 + 45×10"`; `Rutina` muestra el nombre del mesociclo, los microciclos y los ejercicios; `Progreso` tiene una celda con validación de lista cuyos valores son los ejercicios con datos; las celdas de la tabla de progreso son fórmulas `INDEX/MATCH` sobre la hoja `Datos` y la primera fila de resultados ya trae el valor calculado del primer ejercicio; un mesociclo sin entrenos produce el libro sin lanzar errores.
- [ ] **Step 3: Ejecutar** `npx vitest run tests/buildWorkbook.test.ts` → FAIL.
- [ ] **Step 4: Implementar `labels` y `buildWorkbook`.**
  - `Rutina`: bloque de cabecera (nombre, microciclos, semana de descarga) y tabla agrupada por día.
  - `Entrenos`: tabla con filtros automáticos y primera fila fija.
  - `Datos`: una fila por ejercicio y microciclo con la clave `"<ejercicio>|<micro>"` en la columna A, y peso máximo, 1RM, volumen y series en B–E.
  - `Progreso`: celda B2 con lista desplegable de ejercicios; tabla por microciclo (1..n) con `=IFERROR(INDEX(Datos!B:B,MATCH($B$2&"|"&$A5,Datos!A:A,0)),NA())` para cada métrica; resultado precalculado del primer ejercicio; `fullCalcOnLoad` activado.
  - Encabezados en negrita, anchos de columna ajustados.
- [ ] **Step 5: Ejecutar** `npx vitest run tests/buildWorkbook.test.ts` → PASS.
- [ ] **Step 6: Commit** `Libro de Excel del mesociclo con tres hojas`.

### Task 3: Gráficas de Excel en la hoja Progreso

**Files:**
- Create: `src/lib/xlsx/addCharts.ts`
- Create: `scripts/check-xlsx.py` (comprobación manual con `openpyxl`)
- Test: `tests/addCharts.test.ts`
- Modify: `src/lib/xlsx/buildWorkbook.ts` (llama a `addCharts` al final con `try/catch`)

**Interfaces:**
- Consumes: el `Uint8Array` de `buildWorkbook`; el nombre de la hoja `Progreso` y el rango de la tabla (filas de microciclos 1..n).
- Produces: `interface ChartSpec { title: string; sheetName: string; categories: string; values: string; anchorCol: number; anchorRow: number }` (una gráfica de líneas; `categories` y `values` son rangos como `'Progreso'!$A$5:$A$10`) y `addCharts(xlsx: Uint8Array, charts: ChartSpec[]): Promise<Uint8Array>`.

- [ ] **Step 1: Generar una gráfica de referencia con `openpyxl`** (`LineChart` con una serie y categorías) en un archivo temporal fuera del repo y copiar la estructura de `xl/charts/chart1.xml`, `xl/drawings/drawing1.xml`, sus `_rels` y las entradas de `[Content_Types].xml` como plantilla del módulo.
- [ ] **Step 2: Escribir `tests/addCharts.test.ts`**: tras `addCharts`, el zip contiene `xl/charts/chart1.xml` y `chart2.xml`, `xl/drawings/drawing1.xml` y sus relaciones; `[Content_Types].xml` declara los tipos de gráfica y dibujo; la hoja `Progreso` referencia el dibujo; las referencias de las series apuntan a `'Progreso'!$B$5:$B$10` (rango de la tabla); el libro sigue abriéndose con ExcelJS.
- [ ] **Step 3: Ejecutar** `npx vitest run tests/addCharts.test.ts` → FAIL.
- [ ] **Step 4: Implementar `addCharts`** con JSZip (incluido en ExcelJS): inserta las partes del zip a partir de la plantilla, con una gráfica de líneas por `ChartSpec`. Dos gráficas: peso máximo y volumen por microciclo, colocadas a la derecha de la tabla.
- [ ] **Step 5: Conectar** `addCharts` en `buildWorkbook`; si lanza, se devuelve el libro sin gráficas.
- [ ] **Step 6: Ejecutar** `npx vitest run tests/addCharts.test.ts tests/buildWorkbook.test.ts` → PASS.
- [ ] **Step 7: Validar con `openpyxl`:** generar un archivo real (un script de pruebas lo deja en la carpeta temporal del scratchpad), ejecutar `python scripts/check-xlsx.py <archivo>` y confirmar que carga la hoja `Progreso` con 2 gráficas de líneas y sin avisos.
- [ ] **Step 8: Commit** `Gráficas de progreso en el Excel exportado`.

### Task 4: Guardar y compartir el archivo

**Files:**
- Create: `src/lib/shareFile.ts`
- Test: `tests/shareFile.test.ts`
- Modify: `package.json` (`@capacitor/filesystem`, `@capacitor/share`)

**Interfaces:**
- Consumes: `Uint8Array` y nombre de archivo.
- Produces: `saveAndShare(bytes: Uint8Array, fileName: string, mime: string): Promise<'shared' | 'downloaded'>`, `toBase64(bytes: Uint8Array): string`.

- [ ] **Step 1: Instalar** `npm install @capacitor/filesystem@^8 @capacitor/share@^8`.
- [ ] **Step 2: Escribir `tests/shareFile.test.ts`**: `toBase64` de un `Uint8Array` conocido da la cadena esperada y también para 100 000 bytes (sin desbordar la pila).
- [ ] **Step 3: Ejecutar** el test → FAIL.
- [ ] **Step 4: Implementar** `toBase64` por bloques y `saveAndShare`: en móvil escribe en `Directory.Cache` con `Filesystem.writeFile` y abre `Share.share({ url })`; en navegador crea un `Blob` y dispara la descarga. Si el usuario cancela el menú de compartir, no es un error.
- [ ] **Step 5: Ejecutar** `npx vitest run tests/shareFile.test.ts` → PASS.
- [ ] **Step 6: Commit** `Guardar y compartir archivos`.

### Task 5: Botón de exportar

**Files:**
- Create: `src/data/exportMesocycle.ts`
- Create: `src/components/ExportButton.tsx`
- Modify: `src/screens/MesocycleHistoryScreen.tsx` (zona de acciones, sobre la línea ~140)
- Modify: `src/screens/RoutineScreen.tsx` (barra superior del mesociclo activo)
- Modify: `src/i18n/strings.ts` (`exportExcel`, `exporting`, `exportDone`, `exportFailed`)
- Test: `tests/exportMesocycle.test.ts`

**Interfaces:**
- Consumes: `buildWorkbook`, `sanitizeFileName`, `saveAndShare`, `db` de `src/data/db.ts`.
- Produces: `loadExportInput(mesocycleId: string, unit: Unit, lang: 'es' | 'en'): Promise<ExportInput | null>`; `<ExportButton mesocycleId={string} />`.

- [ ] **Step 1: Escribir `tests/exportMesocycle.test.ts`** con `fake-indexeddb` (como `tests/repo.test.ts`): `loadExportInput` de un mesociclo creado con `createMesocycle` devuelve sus días y ejercicios planificados, solo entrenos `done` y sus series; un id inexistente devuelve `null`.
- [ ] **Step 2: Ejecutar** el test → FAIL.
- [ ] **Step 3: Implementar `loadExportInput`** leyendo `mesocycles`, `days`, `planned`, `workouts`, `workoutExercises`, `sets` y los ejercicios implicados de `db` (catálogo y personalizados).
- [ ] **Step 4: Implementar `ExportButton`:** botón con icono; al pulsar carga los datos, construye el archivo, lo comparte y muestra un aviso breve de éxito o de error (estado `exporting` mientras trabaja, sin permitir doble pulsación).
- [ ] **Step 5: Colocar el botón** en `MesocycleHistoryScreen` y en `RoutineScreen`.
- [ ] **Step 6: Ejecutar** `npm test`, `npm run typecheck` y `npm run build` → todo PASS.
- [ ] **Step 7: Commit** `Botón Exportar a Excel en el mesociclo`.

### Task 6: Sincronizar y probar en el móvil

**Files:**
- Modify: `README.md` (créditos de `exceljs`)

**Interfaces:** ninguna.

- [ ] **Step 1: Añadir al README** una línea con `exceljs` y su licencia (MIT).
- [ ] **Step 2: Ejecutar** `npm run android:sync` → termina sin error.
- [ ] **Step 3: Prueba en el móvil** (OPPO A94): abrir un mesociclo con entrenos, pulsar Exportar, compartir a Drive o correo, abrir el archivo en Excel o en el móvil y comprobar las tres hojas, el desplegable y las gráficas; probar también con un mesociclo sin entrenos.
- [ ] **Step 4: Commit** `Créditos de exceljs`.

---

## Autorrevisión

- **Cobertura del diseño:** botón en historial y rutina (T5), hoja Rutina (T1, T2), hoja Entrenos con aproximación y dropset (T1, T2), hoja Progreso con desplegable, tabla y dos gráficas (T2, T3), compartir en Android y descarga en navegador (T4), sin conexión y sin datos personales (Global Constraints), unidad e idioma (T1, T2), solo entrenos terminados (T1, T5), fallo de gráficas sin romper la exportación (T3).
- **Consistencia de tipos:** `ExportInput` y las filas se definen en T1 y se usan igual en T2 y T5; `addCharts` se define en T3 y lo llama T2/T3; `saveAndShare` se define en T4 y lo usa T5.
- **Hueco asumido:** el resultado final de las gráficas lo confirma el usuario abriéndolo en Excel; aquí solo se valida con `openpyxl` y relectura con ExcelJS.
