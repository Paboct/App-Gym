# Comparar dos mesociclos — diseño

Fecha: 2026-11-18. Última función pendiente de la v2 de KPIs (junto con afinar los umbrales de rango).

## Para qué

El usuario quiere poner dos mesociclos uno al lado del otro y ver, de un vistazo, **si ha mejorado**:
sus récords, la puntuación de cada grupo muscular y, en los ejercicios que repite en ambos, cómo
ha evolucionado la carga. Hoy la pantalla de KPIs solo enseña un ámbito cada vez (global o un
mesociclo), así que comparar obliga a ir y venir de memoria.

## Objetivos

- Elegir dos mesociclos (A y B) y ver una **sola pantalla larga** con tres bloques: récords,
  puntuación por grupo y ejercicios en común.
- En cada fila: valor de A, valor de B y la diferencia (▲ verde / ▼ rojo).
- Tocar un ejercicio en común abre una gráfica con la evolución de los dos mesociclos superpuestos.

## Fuera de alcance (decidido por el usuario)

- Entrenos hechos, series por semana, duración media y racha: no se comparan.
- Sin pestañas (se descartó la maqueta B).
- Sin comparar más de dos mesociclos ni comparar con «global».

## Diseño

### Entrada
Botón «Comparar» en la pantalla de KPIs, junto al selector de ámbito (**decisión mía**). Abre la
pantalla de comparación con dos desplegables de mesociclo. Por defecto: B = mesociclo más reciente
con entrenos y A = el anterior (**decisión mía**). Si hay menos de dos mesociclos con entrenos, el
botón se oculta o la pantalla explica que hacen falta dos.

### Bloque 1 · Récords
Número de récords de cada mesociclo (`recordStats(prs).byMesocycle`) y la diferencia.

### Bloque 2 · Puntuación por grupo
Una fila por grupo muscular con `groupScore` calculado para cada mesociclo con el mismo
`ScoreContext` que ya usa la pantalla de KPIs (datos del mesociclo, `weeks` = microciclos con datos).
- Si un grupo solo tiene puntuación en uno de los dos, se muestra «—» en el otro y «solo A/B» en
  lugar de la diferencia.
- Si no tiene en ninguno, la fila no aparece.
- Los umbrales de rango siguen siendo provisionales; la comparación usa la puntuación numérica, no el
  nombre del rango.

### Bloque 3 · Ejercicios en común
Ejercicios con series hechas en **ambos** mesociclos.
- Columnas: nombre, mejor 1RM estimado (`setE1rm`, el mismo criterio que el progreso) en A, en B y
  diferencia en %.
- Orden: mayor cambio absoluto primero (**decisión mía**).
- Al tocar un ejercicio: gráfica de líneas con los dos mesociclos superpuestos, eje X = número de
  microciclo (S1, S2…), de modo que se pueda comparar la misma semana de cada ciclo. Selector
  «1RM / Volumen» (**decisión mía**; el volumen es lo que ya grafica la pantalla de KPIs). Se recortan
  los microciclos finales sin datos, como en `volumeByMicro`.
- Si no hay ejercicios en común, el bloque dice que no hay ninguno.

## Datos y código

- Todo se calcula en memoria con Dexie, sin cambios de esquema ni de nube.
- Lógica nueva en `src/domain/` (función pura que recibe los dos mesociclos y devuelve filas),
  reutilizando `groupByWorkout`, `groupScore`, `recordStats` y la lógica de 1RM por microciclo
  (hoy `bestE1rmByMicro` es privada: exportarla).
- Pantalla nueva `src/screens/CompareScreen.tsx` y entrada en el router; textos en los dos idiomas.
- Pruebas unitarias de la función pura (con y sin ejercicios en común, grupo solo en un lado,
  mesociclos sin récords).

## Segundo modo: comparar dos microciclos de un mesociclo

Añadido a petición del usuario. La pantalla tiene un selector «Mesociclos | Microciclos»; lo descrito
arriba es el modo Mesociclos. El modo Microciclos tiene **un único bloque**, una gráfica:

- Se elige un **ejercicio** de los que tienen series hechas en el mesociclo y **dos microciclos** (A y B)
  de ese mesociclo.
- Gráfica de líneas con **un color por microciclo**. Eje X = número de serie (1, 2, 3…), eje Y = carga.
  Sobre cada punto, las repeticiones realizadas, por ejemplo «80 kg × 8».
- Solo series de trabajo hechas (las que ya cuenta `groupByWorkout`).
- Mesociclo: por defecto el activo; se puede elegir otro del historial (**decisión mía**, cuesta lo mismo).
  Los microciclos que se ofrecen son los que tienen series de ese ejercicio.
- Si el ejercicio se hizo en varios días de la misma semana, las series se numeran seguidas por orden
  cronológico (**decisión mía**; lo normal es un día por semana).
- Si un microciclo tiene menos series que el otro, su línea es más corta; no se rellena.
- Sin ejercicios con datos en al menos dos microciclos, la pantalla lo explica.
- Función pura nueva en `src/domain/` que devuelve, para un ejercicio y un microciclo, la lista
  ordenada de `{ n, carga, reps }`; la gráfica solo pinta eso. Con pruebas unitarias.

## Lo que queda al implementador

Estilo visual de las flechas y la gráfica (seguir la pantalla de KPIs), nombres de las claves de
traducción y detalles de navegación.
