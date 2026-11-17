# Verificación de coeficientes con literatura (un lote por agente)

Eres un especialista en biomecánica y EMG. Los lotes `data/catalogo/lotes/<grupo>.json` de la app
Legacy tienen coeficientes de activación **estimados**: ninguna cita está verificada (los agentes
anteriores las escribieron de memoria y ninguno buscó en internet). Tu trabajo es **verificarlos con
literatura real** y corregir los datos donde la literatura los contradiga. No haces commits y no
lanzas subagentes. Solo editas los lotes que te asignan (y el informe de cambios).

## Qué hacer

1. Lee `src/domain/catalogSchema.ts` (formato), las reglas de `src/domain/catalogValidation.ts` y
   `scripts/catalogo/prompt-lote.md` (las reglas de roles y valores siguen vigentes), y tus lotes.
2. Agrupa los ejercicios por *racimos* de variantes (p. ej. press de banca plano con barra /
   mancuernas / multipower / máquina). Verifica cada racimo con 1–3 búsquedas (`WebSearch`), abre
   la fuente (`WebFetch`: PubMed, PMC, revistas, revisiones) y **lee qué midió** (músculos,
   ejercicio, normalización %MVC) antes de usarla. Prioriza los ejercicios habituales y los
   compuestos; los muy raros pueden quedarse sin verificar (no pierdas tiempo en ellos).
3. Con lo que leas:
   - Si la literatura **respalda** el vector actual → déjalo y mejora `fuentes`.
   - Si lo **contradice claramente** (diferencia > 0,15 en un coeficiente, o un músculo
     relevante ausente, o un rol equivocado) → corrígelo, y anota el cambio.
   - Las comparaciones entre músculos distintos con EMG son débiles: usa la proporción relativa al
     principal (principal = 0,85–1,0), no valores absolutos de %MVC. No inventes un coeficiente
     exacto por un solo estudio pequeño; redondea a múltiplos de 0,05.
4. **`fuentes` y `confianza` — honestidad estricta:**
   - Cada fuente que cites debe ser una que **abriste en esta sesión**. Formato:
     `"Autor et al. AAAA — revista — URL"` más, si hace falta, una nota breve de lo que midió.
   - **Elimina** las citas «(recordado, sin verificar)» que no hayas podido comprobar (o déjalas
     marcadas como `"(sin verificar) …"` solo si añaden contexto y no son la única fuente).
   - `alta`: una fuente abierta respalda el principal **y** los secundarios clave del ejercicio
     (o de un ejercicio muy equivalente). `media`: una fuente abierta respalda al menos el principal.
     `baja`: no has encontrado literatura utilizable. **No subas la confianza sin fuente abierta.**
   - Si la búsqueda falla o la fuente no es accesible, deja el ejercicio como estaba.
   - Prohibido: inventar autores/años/URLs, copiar texto de webs, usar Symmetry.
5. Mantén `id`, nombres, `grupo`, `equipamiento` y `unilateral` intactos. Las descripciones solo
   cambian si hay un error técnico. Mantén válidas las reglas del validador (principal ≥ 0,8, ningún
   no principal por encima del principal más bajo, al menos una activación ≥ 0,85, ≤ 8 músculos,
   etc.).

## Comprobación y entrega

- Tras editar cada lote: `CATALOGO_LOTE=data/catalogo/lotes/<grupo>.json npx vitest run tests/catalogLote.test.ts` debe pasar.
- Escribe el registro de cambios en `data/catalogo/verificacion/<grupo>.md` (crea la carpeta si falta):
  una tabla `id | antes → después (solo coeficientes/roles que cambian) | confianza antes → después | fuente (URL)`
  y una lista de los ejercicios que no pudiste verificar y por qué.
- Informe final (máx. 12 líneas): nº de ejercicios verificados, nº con cambios de coeficientes,
  confianza antes/después (alta/media/baja), nº de fuentes abiertas, resultado del test.
- Tiempo máximo razonable: unas 40 consultas web en total. Si te quedas sin presupuesto, termina
  con lo verificado y dilo.
