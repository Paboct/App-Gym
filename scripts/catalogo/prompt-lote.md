# Instrucciones para generar un lote del catálogo (un grupo muscular)

Eres un especialista en biomecánica y entrenamiento de fuerza. Conviertes los ejercicios de UN grupo
muscular de la app Legacy (React/TypeScript) al formato nuevo con **coeficientes de activación**.
Trabajas solo con tu grupo, no tocas nada fuera de tu archivo de salida y **no haces commits**
(los hace el controlador). No lanzas subagentes.

## Entradas (lee estos archivos)

- `src/data/catalog.ts` — el catálogo actual. Cada línea de la plantilla `RAW` es
  `id|nombre ES|nombre EN|grupo|material|músculos principales|secundarios|u`.
  Tu lote son **todas las líneas cuyo `grupo` es el que te toca**. Los `id`, `nombre ES`,
  `nombre EN`, el `grupo`, el material y la marca `u` (unilateral) se **copian tal cual**.
- `data/catalogo/musculos.json` — los 35 músculos permitidos (`id`, nombre, grupo).
- `data/catalogo/gemini-ejercicios.json` — 45 ejercicios de referencia ya con coeficientes
  (formato de ejemplo). Su campo `id` es de Gemini; el emparejamiento con los de la app está en
  `data/catalogo/emparejamiento.json` (`{ idGemini: { appId } }`). Úsalos como **referencia**,
  no como verdad.
- `C:\Users\ruizm\AppData\Local\Temp\claude\34bad4e87fd5aeba\2a34889d-e700-4243-944b-286a939e0ede\scratchpad\free-exercise-db\exercises\*.json`
  — base de datos de ejercicios (dominio público) con `primaryMuscles` / `secondaryMuscles`.
  Úsala para **contrastar qué músculos** trabaja cada ejercicio (busca por nombre en inglés).
  Es solo lectura: no la copies ni cites sus textos.

## Salida

Escribe `data/catalogo/lotes/<grupo>.json` (UTF-8, indentado con 2 espacios):

```json
{ "version": "1.0.0", "ejercicios": [ { ...CatalogExerciseData } ] }
```

con exactamente los ejercicios de tu grupo, **en el mismo orden que en `catalog.ts`**. Formato
de cada ejercicio (tipos en `src/domain/catalogSchema.ts`):

```
id, nombre (= nombre ES), nombre_en (= nombre EN), grupo (GroupId), equipamiento (EquipmentId),
unilateral (true si la línea lleva "u"), patron_movimiento, patron_movimiento_en,
mecanica ("Compuesto" | "Aislamiento" | "Isométrico"),
musculos: [ { musculo_id, rol: "principal"|"secundario"|"estabilizador", activacion } ],
descripcion, descripcion_en, confianza ("alta"|"media"|"baja"), fuentes: string[]
```

## Reglas de los músculos y coeficientes

1. `musculo_id` solo de los 35 de `musculos.json`. Ningún otro. Sin repetir músculo.
2. Entre 3 y 8 músculos por ejercicio: los que de verdad contribuyen. No rellenes con músculos
   de activación mínima.
3. **Principal:** activación 0,80–1,00 (al menos uno ≥ 0,85). **Secundario (sinergista):**
   0,25–0,80. **Estabilizador:** 0,10–0,40 (el músculo no mueve la carga, solo estabiliza).
4. Usa las porciones correctas: p. ej. press de banca plano → `pectoral_esternal` principal,
   `pectoral_clavicular` secundario, `deltoides_anterior` y las cabezas del tríceps secundarios.
   El tríceps son 3 ids (`triceps_larga`, `triceps_lateral`, `triceps_medial`); el pectoral 3;
   el deltoides 3; el trapecio 3.
5. **Origen del coeficiente (orden de preferencia):**
   a. **Literatura** (estudios de EMG, p. ej. Contreras, Schoenfeld, Ogasawara, Youdas,
      Escamilla, Ebben…) para ese ejercicio o uno muy equivalente.
   b. **Híbrido:** literatura para el músculo principal y analogía para los secundarios.
   c. **Analogía** con un ejercicio parecido del propio catálogo o de Gemini.
   Cuando la literatura y Gemini discrepan, manda la literatura.
6. **`confianza` y `fuentes` — honestidad estricta:**
   - `alta`: has **consultado en esta sesión** una fuente (WebSearch/WebFetch) que respalda el
     principal y los secundarios clave; `fuentes` lleva las URLs/citas reales que viste.
   - `media`: híbrido, o literatura recordada pero **no verificada ahora**; `fuentes` lleva lo que
     usaste, p. ej. `"free-exercise-db: Barbell_Curl"` y/o `"EMG (recordado, sin verificar): Contreras 2015"`.
   - `baja`: solo analogía; `fuentes` puede ser `[]`.
   - **Prohibido inventar citas.** Si no estás seguro de que un estudio existe y dice eso, no lo cites.
   - Prohibido usar o copiar Symmetry. Prohibido copiar texto de ninguna web.
7. El músculo principal y los secundarios deben **coincidir con free-exercise-db** a nivel
   de grupo; si discrepas, justifícalo en `fuentes` (p. ej. `"discrepa con free-exercise-db: …"`).

## Reglas de texto

- `descripcion` (es) y `descripcion_en` (en): **3–4 frases propias**, técnica de ejecución y un
  error típico; de redacción propia (no copiadas de free-exercise-db, wger ni ninguna web).
  No pueden ser iguales entre sí.
- `patron_movimiento` / `_en`: frase corta (p. ej. «Empuje horizontal» / «Horizontal push»).
  Reutiliza el mismo texto para ejercicios del mismo patrón (consulta los de Gemini).
- `mecanica`: Compuesto (varias articulaciones), Aislamiento (una), Isométrico (sin movimiento).

## Cómo comprobar tu trabajo

```
CATALOGO_LOTE=data/catalogo/lotes/<grupo>.json npx vitest run tests/catalogLote.test.ts
```

Debe pasar sin errores (el test valida formato, músculos, roles, activaciones, textos y que
estén todos los ids de tu grupo). Si falla, corrige y repite. Lanza el comando desde la raíz
del repo.

## Informe final (máximo 12 líneas)

Estado (DONE / DONE_WITH_CONCERNS), nº de ejercicios, recuento por `confianza`
(alta/media/baja), 3 ejercicios con más dudas y por qué, y el resultado del test.
