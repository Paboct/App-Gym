# Forja · Especificación

Decisiones tomadas en el cuestionario del 12 de noviembre de 2026 y estado de cada parte.
«Forja» es el nombre provisional de la app.

## 1. Alcance y tecnología

| Tema | Decisión |
| --- | --- |
| Público | Uso personal primero; publicación en Play Store después |
| Plataformas | Android (APK) y ordenadores (navegador), con el mismo código |
| Tecnología | React + TypeScript + Vite; Capacitor para empaquetar en Android |
| Datos locales | IndexedDB (Dexie). La app funciona siempre sin conexión |
| Nube | Supabase (PostgreSQL), plan gratuito. Inicio de sesión con Google |
| Idiomas | Español por defecto, inglés opcional |
| Tema | Oscuro y claro; paleta rojo y dorado |
| Unidades | kg por defecto, libras opcional (los datos se guardan en kg) |
| Compilación | GitHub Actions: tests, build web y APK en cada push |

Se eligió tecnología web en lugar de Kotlin nativo para que la app corra también en
ordenadores y se pueda probar de forma automática. Contrapartida: los widgets y el
reloj del backlog necesitarán un módulo nativo aparte.

## 2. Reglas de negocio

### Mesociclos y microciclos

- Un mesociclo tiene un número configurable de microciclos (por defecto 6).
- Solo hay un mesociclo activo. Al crear o duplicar otro, el activo pasa al historial.
- Los días van en secuencia (Día 1, Día 2…) y llevan nombre propio. No están atados
  al día de la semana: si un día no se puede entrenar, se hace el siguiente cuando toque.
- Todos los microciclos repiten los mismos ejercicios. Pueden variar las series y el
  RIR de cada semana.
- Semana de descarga opcional: mitad de series y RIR 8, salvo ajuste manual.
- Sustituir un ejercicio a mitad de mesociclo pregunta el alcance: solo esa semana
  o todas las que quedan.
- Un mesociclo terminado se puede duplicar como base del siguiente (días y
  ejercicios, sin entrenos).

### Ejercicios

- Por ejercicio: series, un rango de repeticiones, RIR objetivo, descanso y notas.
- Los unilaterales se etiquetan «por lado»; no se registra izquierda y derecha por separado.
- Peso con mancuernas: por mancuerna. Dominadas y fondos: solo el lastre. Máquinas:
  lo que marque la placa.
- Se pueden crear ejercicios propios; su imagen es el mapa corporal con las zonas marcadas.
- Sin superseries por ahora.

### Entreno

- RIR en escala 8–10: 8 = dos en recámara, 9 = una, 10 = al fallo.
- Dropset: hasta 3 bajadas, cada una con peso y repeticiones. Sin otras técnicas.
- Las series de aproximación se registran pero no cuentan para las métricas.
- Cada serie muestra, en pequeño y en color tenue, lo hecho la semana anterior y una
  sugerencia de doble progresión (tope del rango → más peso; si no, una repetición más).
- Temporizador de descanso con vibración.
- Durante el entreno se pueden añadir o quitar series, sustituir, reordenar y anotar.
- Un entreno terminado no se edita. Sí se puede registrar uno con fecha pasada.

### Métricas

- **Volumen** = peso × repeticiones de las series efectivas. No incluye las bajadas
  de los dropsets ni las series de aproximación (la app lo avisa).
- **1RM estimado** con la fórmula de Epley: peso × (1 + repeticiones / 30).
- **Récord (PR)** = mejor 1RM estimado de un ejercicio. El primer entreno de un
  ejercicio fija la marca de partida, sin trofeo. Cada récord queda ligado al
  microciclo donde se consiguió (🏆).

## 3. Estado

### Hecho en la v0.1

- Rutina: crear y editar mesociclos, días, ejercicios, variaciones por semana,
  descarga, sustituciones.
- Catálogo propio de 125 ejercicios en español e inglés con músculos principales y
  secundarios (22 músculos, 12 grupos), favoritos y ejercicios propios.
- Mapa corporal de frente y espalda, figura masculina o femenina, con músculos
  principales y secundarios en dos colores y la lista debajo en letra pequeña.
- Entreno en vivo completo y resumen con duración, volumen, récords, gráfica de
  volumen por ejercicio frente a la semana anterior y frase de motivación.
- Historial: mesociclos, cuadrícula día × semana, récords por semana, duplicar, borrar.
- Perfil: idioma, tema, unidades, figura y registro de peso corporal.
- Esquema de la base de datos en la nube con seguridad por filas
  (`supabase/migrations/0001_init.sql`), probado en PostgreSQL 16.
- 42 tests unitarios de la lógica y de la capa de datos.

### Pendiente de la v1

| Tarea | Depende de |
| --- | --- |
| Sincronización con Supabase e inicio de sesión con Google | Crear el proyecto de Supabase y las credenciales de Google |
| Exportar a Excel | — |
| Aviso de fin de descanso con la pantalla apagada (notificación local) | Probar en un móvil real |
| Icono y logo definitivos (dioses griegos) | Elegir entre propuestas |
| Primera compilación del APK en GitHub Actions | Acceso de escritura al repositorio |
| Imágenes de la ejecución de cada ejercicio | Decidir fuente: generadas o `free-exercise-db` (dominio público) |

### v2 · KPIs

- Mapa corporal coloreado por rango de cada grupo muscular, global y por mesociclo.
- Rango = mezcla ponderada con más peso para el progreso:
  progreso propio (50 %), fuerza relativa al peso corporal (30 %) y volumen de
  trabajo (20 %). Los pesos son una propuesta inicial para ajustar con datos reales.
- El rango de un grupo muscular pondera sus ejercicios según cuánto lo trabajan
  (principal o secundario).
- Nombres y colores de los rangos al estilo de Symmetry. La lista exacta está
  pendiente de confirmar con capturas de la app.
- Gráfica de volumen por ejercicio comparando microciclos de un mesociclo, y gráfica
  global, cada una con su desplegable de ejercicio.
- Favoritos: sus gráficas quedan fijadas en el panel.
- Récords: número de PRs, microciclos y mesociclos con más PRs y cuándo salieron.
- Series semanales por grupo muscular, rachas y duración media de sesión.
- Comparar dos mesociclos.

### Backlog

Widgets de Android, reloj (Xiaomi), Health Connect, medidas corporales, fotos de
progreso, calculadora de discos, recordatorios, importar datos antiguos.

## 4. Puesta en marcha de la nube

Pasos que tiene que hacer el dueño de las cuentas:

1. Crear un proyecto gratuito en Supabase y ejecutar `supabase/migrations/0001_init.sql`
   en su editor SQL.
2. En Google Cloud, crear unas credenciales OAuth para la app (web y Android).
3. En Supabase, activar Google como proveedor de inicio de sesión con esas credenciales.
4. Pasar la URL del proyecto y la clave pública (`anon key`). Son públicas por
   diseño: la protección la da la seguridad por filas.
