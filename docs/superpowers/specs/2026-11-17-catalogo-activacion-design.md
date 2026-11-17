# Catálogo de ejercicios con coeficientes de activación (35 músculos)

Fecha: 2026-11-17 · Estado: borrador pendiente de aprobación

## Intención

Hoy cada ejercicio dice qué músculos trabaja como *principal* o *secundario* (22 músculos).
Eso no permite medir cuánto trabaja cada músculo. El usuario quiere un formato con un
**coeficiente de activación** (0–1) por músculo, de modo que:

- **Volumen semanal efectivo** por músculo = Σ (series × activación). Ejemplo: 4 series de
  press de banca y 3 de press militar dan al deltoides anterior (4 × 0,55) + (3 × 1,0) = 5,2
  series efectivas.
- **Colorimetría anatómica**: el mapa corporal de la ficha del ejercicio se colorea con el
  coeficiente, sin reglas manuales por ejercicio.

El formato de referencia es `Descargas/ejercicios.json`, generado por Gemini (45 ejercicios,
35 músculos). El usuario quiere que ese sea el formato oficial de **todo** el catálogo.

## Objetivos

1. Los **240 ejercicios actuales** quedan en el formato nuevo, con sus coeficientes, patrón de
   movimiento, mecánica y descripción en **español e inglés**. Se conservan sus `id`
   (los entrenos guardados y las imágenes `public/exercises/<id>.webp` apuntan a ellos).
2. Los músculos implicados y el rol principal/secundario han de ser **correctos**. Se
   contrastan con fuentes externas, no solo con lo que escribió Gemini.
3. El mapa corporal usa el SVG nuevo de 35 zonas (`data-musculo="id"`).
4. Los KPIs usan series efectivas (series × activación).

## No objetivos / antipatrones

- No raspar ni copiar contenido de Symmetry (propietario); solo es inspiración visual.
- No incorporar contenido con licencia incompatible. El catálogo se presenta como «sin
  restricciones de licencia»: las fuentes permitidas son de dominio público o se usan solo
  como referencia factual (listas de músculos), reescribiendo los textos.
- No romper los datos guardados: ningún `id` de ejercicio cambia.
- No cambiar el sistema de rangos (Hierro…Legacy) ni sus pesos 50/30/20 en esta entrega.
- No presentar los coeficientes como datos medidos: son **estimaciones** y la app lo indica.

## Decisiones tomadas por el usuario

- **Enfoque híbrido (C)**: el JSON detallado de 35 músculos es el formato oficial; el mapa
  usa el SVG de 35 zonas.
- Orden: **primero los datos, después la app**.
- Los 240 ejercicios actuales se convierten completos (no solo los 45 de Gemini).
- La descripción se ve en la ficha ⓘ existente (`ExerciseDetail`), junto con patrón de
  movimiento y mecánica (etiquetas) y el coeficiente de cada músculo (p. ej. «Pectoral
  esternal · 100 %»). Descripciones en es y en.
- Escala de color de la **ficha del ejercicio**: ≥ 0,8 rojo intenso · 0,4–0,79 naranja ·
  < 0,4 amarillo suave.
- El **mapa de KPIs** sigue coloreado por rango; solo cambia que el volumen se calcula como
  series × activación.

## Parte 1 · Datos

**Formato** (igual que el de Gemini): `{ version, catalogo_musculos, ejercicios[] }`; cada
ejercicio con `id, nombre, grupo_principal, patron_movimiento, mecanica, equipamiento,
musculos[{musculo_id, rol, activacion}], descripcion`. Se añadirán `nombre_en`,
`descripcion_en`, `unilateral` y los campos de la app (`group`, `equipment` como ids).

**Fuentes** para verificar músculos y completar texto: `free-exercise-db` (dominio público),
`wger` (CC-BY-SA, solo referencia factual), literatura de EMG para los coeficientes. Ninguna
fuente trae coeficientes 0–1; salen de EMG y de los valores de Gemini, marcados como estimación.

**Validación automática** (script en el repo): todo `musculo_id` existe en el catálogo; cada
ejercicio tiene ≥ 1 músculo `principal`; `activacion` ∈ (0, 1]; el principal tiene el valor
máximo; `rol` coherente con el umbral (principal ≥ 0,8 salvo excepciones justificadas);
descripciones es y en no vacías; ids únicos y estables; todo `id` actual del catálogo sigue
presente.

**Criterio de calidad de los coeficientes (decidido por el usuario):** se usa la literatura
(EMG) cuando existe para ese ejercicio o uno muy equivalente; si no, se estima por analogía
con los 45 de Gemini y con ejercicios parecidos; se admite un método híbrido (literatura
para el músculo principal y analogía para los secundarios). Cada ejercicio lleva un campo
`confianza`: `alta` (literatura), `media` (híbrido) o `baja` (solo analogía). La literatura
manda sobre Gemini cuando discrepan.

**Revisión humana:** la salida incluye una lista de ejercicios de baja confianza (sin fuente
contrastada o con discrepancia entre fuentes) para que el usuario los revise.

## Parte 2 · App

- **Dominio:** `MUSCLES` pasa de 22 a 35 ids (los del JSON). `MUSCLE_GROUP` se rehace
  (35 → los 12 grupos actuales, que se mantienen para filtros y KPIs). `Exercise` cambia
  `primary/secondary` por `muscles: {id, role, activation}[]`; se pueden derivar
  `primary/secondary` para el código antiguo mientras dure la migración.
- **Catálogo:** `CATALOG` se genera desde el JSON validado (sustituye al RAW de pipes en
  `src/data/catalog.ts`); `ensureCatalog()` sigue haciendo `bulkPut`.
- **Migración de datos del usuario:** los ejercicios creados por el usuario (`custom: true`)
  guardan hoy ids antiguos (22 músculos). Se convierten a los ids nuevos con un mapa fijo
  22 → 35 (un id viejo puede abrirse en varios nuevos; p. ej. `chest_mid` → `pectoral_esternal`,
  `triceps` → las 3 cabezas). Principal = 1,0 y secundario = 0,5 (decisión provisional mía).
  Nueva versión de Dexie.
- **Nube:** `custom_exercises` en Supabase tiene `primary_muscles/secondary_muscles`. Hace falta
  una migración `0004` (aplicada a mano, como las anteriores) y adaptar `syncMap.ts`.
  Compatibilidad hacia atrás con filas antiguas.
- **Mapa:** `BodyMap` usa el SVG nuevo (copia en el proyecto, sin clases de color fijas;
  se pinta por `data-musculo` con `fill`/opacidad). Se valida con un test que comprueba que
  los 35 ids existen en el SVG.
- **Ficha ⓘ:** descripción (es/en), patrón, mecánica y lista de músculos con su %.
- **Formulario «crear ejercicio»:** sigue con el toque principal/secundario/quitar, ahora
  sobre 35 músculos (agrupados por grupo para que no abrume).
- **KPIs:** `kpi.ts` usa series × activación para el volumen por músculo y por grupo.
- **Tests:** se actualizan los 118 existentes y se añaden los de migración, validación del
  catálogo y series efectivas.

## Restricciones

React + TypeScript + Vite, Capacitor/Android, Dexie, Supabase. Español como idioma de
trabajo y de commits. Sin claves secretas en el código. Tests con `npm test`,
`npm run typecheck`.

## Decisiones mías (a revisar)

- Se conserva el `group` de 12 grupos de la app y `grupo_principal` de Gemini (7 grupos) se
  descarta como filtro.
- Coeficientes de ejercicios del usuario: 1,0 y 0,5.
- El SVG se etiquetó a partir de los comentarios de Gemini; la geometría es aproximada
  (el «transverso» y los vastos se ven poco naturales) y se retocará aparte si molesta.
- Los músculos profundos (transverso, sóleo, manguito) tienen zona pequeña en el SVG; no se
  garantiza que sean pulsables con comodidad.

- **Archivos de entrada:** `C:\Users\ruizm\Downloads\ejercicios.json` (trae su propio
  `catalogo_musculos` de 35 ids) y `C:\Users\ruizm\Downloads\gemini-svg.svg` (sin
  `data-musculo`; cada grupo `<g class="muscle">` va precedido de un comentario con el nombre
  del músculo). El script de etiquetado ya existe: mapea comentario → id, produce 40 grupos y
  35 ids únicos sin faltas ni sobrantes. Hay que copiarlos al repo (el SVG ya etiquetado
  a `src/assets/` o `public/`, y el JSON de partida a `docs/` o `data/`).
- **Emparejar los 45 de Gemini con los 240 actuales:** los ids de Gemini (`pecho_001`) no
  coinciden con los de la app (`bench_press`). Se empareja por nombre y el resultado se
  revisa a mano; el `id` de la app es siempre el que manda.
- **Entrenos y KPIs ya guardados:** el volumen y los rangos se calculan al vuelo desde el
  catálogo, así que se recalculan solos con los coeficientes nuevos. Es esperable que los
  rangos se muevan algo. El implementador debe comprobar que no haya valores derivados
  persistidos que recalcular.
- **Nube:** la migración `0004` **añade** una columna nueva (p. ej. `muscles jsonb`) y
  conserva `primary_muscles/secondary_muscles`. Se escriben ambas durante un tiempo; al leer,
  si falta la nueva se construye desde las antiguas.
- **Volumen por grupo (12 grupos):** para un grupo se usa la **activación máxima** de sus
  músculos en el ejercicio (≈ 1 si es principal, ≈ 0,5 si es secundario), no la suma. Así un
  press de banca cuenta como máximo 1 serie efectiva por serie para «Pecho» y los umbrales de
  rango actuales no se desplazan. La suma por músculo individual solo se usa en la vista por
  músculo.
- **Tabla 35 → 12 grupos (propuesta):** pecho (3 porciones, serrato) → Pecho; dorsal, redondo
  mayor, romboides, 3 trapecios, erectores → Espalda; 3 deltoides, manguito → Hombros; bíceps
  braquial, braquial anterior, braquiorradial → Bíceps; 3 cabezas → Tríceps; flexores y
  extensores → Antebrazos; recto abdominal, oblicuos, transverso → Core; glúteo mayor y medio →
  Glúteos; vastos, recto femoral → Cuádriceps; isquiotibiales → Isquios; aductores →
  Aductores; gastrocnemio, sóleo, tibial anterior → Gemelos.

## Lo que queda al implementador

Estructura de carpetas, nombres de scripts, cómo repartir el trabajo de generación de
datos (p. ej. por grupo muscular, en paralelo) y los detalles de la migración de Dexie.
