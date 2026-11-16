# Exportar un mesociclo a Excel — diseño

Fecha: 2026-11-16. Estado: aprobado por el usuario (tras ver la maqueta).

## Intención

Poder sacar de la app un mesociclo (activo o archivado) en un archivo Excel para analizar el progreso, comparar microciclos y compartir la rutina con otras personas. Es una primera versión: el archivo se ve y se analiza en Excel; no se vuelve a importar en la app.

## Objetivos

- Botón "Exportar a Excel" en cada mesociclo, que genera un `.xlsx` y abre el menú de compartir de Android (WhatsApp, correo, Drive…).
- Hoja **Rutina**, pensada para compartir: nombre del mesociclo, número de microciclos, semana de descarga y, por cada día, sus ejercicios con series, rango de repeticiones, RIR objetivo, descanso y notas.
- Hoja **Entrenos**: una fila por serie, con microciclo, día, fecha, ejercicio, tipo de serie (aproximación o efectiva), número de serie, peso, repeticiones, RIR, bajadas del dropset y volumen movido.
- Hoja **Progreso**: un desplegable para elegir ejercicio, una tabla por microciclo (peso máximo, 1RM estimado, volumen, series efectivas) y gráficas que comparan los microciclos.
- Funciona sin conexión y no envía datos a ningún servidor.

## No objetivos

- Importar el Excel de vuelta a la app.
- Exportar todo el histórico o varios mesociclos a la vez.
- Estilos de impresión, logotipos o diseño elaborado.

## Anti-objetivos

- Un archivo que Excel diga que está dañado o que pida "reparar".
- Mezclar unidades: los pesos salen en la unidad que el usuario tiene elegida (kg o lb).
- Incluir datos personales (correo, identificadores de cuenta). Solo contenido de entrenamiento.

## Decisiones del usuario

- Una sola exportación por mesociclo, con la rutina, los entrenos y la gráfica de progreso con comparación de microciclos.
- Las series de aproximación y el dropset aparecen en el archivo.
- Primera versión: solo lectura y análisis en Excel.

## Decisiones mías (a revisar)

- **Librería:** ExcelJS para crear las hojas. No trae gráficas, así que las añado después como gráficas de Excel de verdad (editables), a partir de plantillas de gráfica generadas con otra herramienta (`openpyxl`) que Excel abre sin problemas. Si añadir las gráficas fallara, el archivo se exporta igualmente sin ellas.
- **Desplegable de ejercicio:** en la hoja Progreso, una celda con lista desplegable elige el ejercicio; la tabla y las gráficas se actualizan con fórmulas (`INDEX/MATCH` sobre una hoja de datos de progreso). Es lo mismo que el desplegable de la pantalla de KPIs de la app.
- **Gráficas:** dos, de líneas, con los microciclos en el eje horizontal: peso máximo por microciclo y volumen por microciclo.
- **Entrega en el móvil:** plugins de Capacitor para guardar el archivo y abrir el menú de compartir. En navegador, descarga directa.
- **Idioma y unidades:** los encabezados siguen el idioma de la app; los pesos, la unidad elegida.
- **Nombre del archivo:** `<nombre del mesociclo>.xlsx`, con los caracteres no válidos reemplazados.
- **Qué entra:** solo entrenos terminados (`done`). Los que están en curso no se exportan.
- **Estilo:** encabezados en negrita, filas fijadas arriba, anchos de columna ajustados y filtros en la hoja Entrenos. Nada más.

## Orden de trabajo

1. Funciones puras que convierten los datos del mesociclo en filas (rutina, entrenos, progreso), con tests.
2. Generación del libro con ExcelJS (tres hojas, más una de datos de progreso para las fórmulas).
3. Gráficas inyectadas en la hoja Progreso, validadas releyendo el archivo.
4. Botón de exportar, guardado y compartir en Android.
5. Probar en el móvil.

## Pendiente de decidir por el constructor

- Dónde se coloca el botón exactamente (pantalla del mesociclo o del historial de mesociclos). Propuesta: en el historial, en cada mesociclo, y también en la pantalla de rutina del mesociclo activo.
- Si el desplegable y las fórmulas fallan en alguna app de hojas de cálculo del móvil, se deja la tabla ya calculada para el primer ejercicio como alternativa.
