# Legacy · Especificación

Decisiones tomadas en el cuestionario del 12 de noviembre de 2026 y estado de cada parte.
La app se llama **Legacy** y su lema es *Build your legacy*.

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

### Hecho (v1 cerrada el 17 de noviembre de 2026, en `main`)

- Rutina: crear y editar mesociclos, días, ejercicios, variaciones por semana,
  descarga, sustituciones.
- Catálogo propio de 240 ejercicios (222 con foto) en español e inglés, favoritos y
  ejercicios propios. Cada ejercicio con foto la lleva de free-exercise-db (dominio
  público; ver README).
- **Catálogo con activación** (rama `catalogo-app`): 35 músculos en 12 grupos; cada
  ejercicio lleva descripción, patrón de movimiento, mecánica y, por músculo, un rol
  (principal, secundario o estabilizador) y un coeficiente de activación de 0 a 1.
  Confianza de los coeficientes: 13 alta, 104 media y 123 baja (son estimaciones
  razonadas, no medidas). Los ejercicios propios se crean con principal = 1,0 y
  secundario = 0,5.
- Los **estabilizadores** se muestran en la ficha y en el mapa, pero **no cuentan**
  para series ni volumen. El volumen y las series de un **grupo** usan la activación
  máxima de sus músculos en el ejercicio; las series efectivas por músculo son
  series × activación. Decisión del peso muerto: trabaja glúteo e isquiotibiales
  (principales), no la espalda baja.
- Ficha del ejercicio (ⓘ) con descripción, patrón, mapa coloreado por tramos
  (alta ≥ 0,8, media ≥ 0,4, baja) y lista de músculos con su porcentaje.
- Mapa corporal de 35 zonas, de frente y espalda, figura masculina o femenina
  (SVG propios en `src/assets/body/`, generados a `src/data/bodyArt.ts` con
  `scripts/catalogo/generar-bodyart.mjs`), coloreado por activación.
- Los datos del catálogo y su proceso de generación y revisión están en
  `data/catalogo/` (`ejercicios.json` es la fuente; `src/data/catalog.json` es la
  copia sin `fuentes` que genera `scripts/catalogo/generar-catalog-json.mjs`). La
  validación es `tests/catalogData.test.ts`.
- Entreno en vivo completo y resumen con duración, volumen, récords, gráfica de
  volumen por ejercicio frente a la semana anterior y frase de motivación.
- Temporizador de descanso con vibración y aviso de fin con notificación local
  (probado con la pantalla apagada). Descanso por defecto 2:30, ajuste -15/+15/+30.
- Historial: mesociclos, cuadrícula día × semana, récords por semana, duplicar, borrar.
- Perfil: idioma, tema, unidades, figura y registro de peso corporal.
- **Exportar a Excel** un mesociclo (3 hojas: Rutina, Entrenos, Progreso con
  desplegable y gráficas). Se guarda y comparte desde la app. Probado en el móvil.
- **Nube**: sincronización con Supabase (empuje y bajada, gana la marca de tiempo
  más reciente, borrados con `deleted_at`) e inicio de sesión con email o con
  **Google** (nativo en Android, `@capgo/capacitor-social-login` +
  `signInWithIdToken`). Probado en el móvil.
- Iconos y pantallas de arranque de Android con el logo centrado ópticamente
  (`npm run android:assets`).
- Más de 190 tests (Vitest).

### Pendiente de la v1

| Tarea | Depende de |
| --- | --- |
| Logo en alta resolución (ahora es un redibujo vectorial del boceto) | Archivo original del logo |
| Título de la ficha de Play Store (ya existen «Legacy Athletics» y «Legacy Gym») | Decidir al publicar (el usuario lo pospone) |
| Comprobar que el APK de GitHub Actions compila con el plugin de Google | Mirar la pestaña Actions tras el push a `main` |
| **Aplicar `supabase/migrations/0004_exercise_muscles.sql` a mano** en el editor SQL del proyecto Legacy, ANTES de probar la sincronización en el móvil con una sesión | Hacerlo desde el panel de Supabase |
| Firma de publicación para Play Store (hoy se usa `android/debug.keystore`) | Al publicar; hará falta añadir su SHA-1 al cliente Android de Google Cloud |

### v2 · KPIs

**Ya implementado** (`src/screens/KpiScreen.tsx`, `src/domain/kpi.ts`, `tests/kpi.test.ts`):

- Mapa corporal coloreado por rango de cada grupo muscular, global y por mesociclo.
- Rango = mezcla ponderada: progreso propio (50 %), fuerza relativa al peso corporal
  (30 %) y volumen de trabajo (20 %). El grupo pondera sus ejercicios según cuánto lo
  trabajan (principal o secundario).
- 9 rangos con colores propios al estilo Symmetry: Hierro, Bronce, Plata, Oro, Rubí,
  Esmeralda, Diamante, Amatista y **Legacy** (el máximo).
- Gráfica de volumen por ejercicio por microciclo y global, con desplegable; favoritos fijados.
- Récords (total, mejor microciclo y mesociclo), series semanales por grupo, rachas
  y duración media de sesión.

**Pendiente:**

- Comparar dos mesociclos.
- Afinar los umbrales de puntuación de cada rango y los pesos 50/30/20 con datos reales
  (la app los marca como provisionales).

### Backlog

Widgets de Android, reloj (Xiaomi), Health Connect, medidas corporales, fotos de
progreso, calculadora de discos, recordatorios, importar datos antiguos.

## 4. Puesta en marcha de la nube

**Hecho.** Configuración actual, por si hay que repetirla:

- **Supabase:** organización «Paboct», proyecto **Legacy** (`oggbdljjuydctazkujnz`,
  región `eu-north-1`). Migraciones `0001_init.sql`, `0002_sync.sql` y
  `0003_fix_active_index.sql` aplicadas a mano desde el editor SQL (la tabla
  `supabase_migrations` está vacía). **`0004_exercise_muscles.sql` (columna
  `muscles jsonb` en `custom_exercises`) está escrita pero sin aplicar**: hay que
  ejecutarla a mano en el editor SQL de «Legacy». Mientras no se aplique, subir
  `custom_exercises` falla y, como el empuje es un solo lote, bloquea también el resto
  de tablas. La URL y la clave `sb_publishable_…` están en
  `src/data/supabase.ts`; son públicas y la protección es la seguridad por filas.
- **Google Cloud:** proyecto `app-gimnasio-515008`, pantalla de consentimiento
  «Externo» en modo prueba (solo entran los usuarios de prueba añadidos en *Audiencia*).
  Dos clientes OAuth: **web** (su Client ID está en `src/lib/auth.tsx`; el secret solo
  vive en Supabase) y **Android** (`com.paboct.legacy` + SHA-1 de `android/debug.keystore`:
  `6D:0C:2E:14:FA:66:32:6B:4E:AF:EA:BF:7F:42:87:AB:6A:B9:48:F0`).
- **Supabase → Authentication → Google:** activado con los dos Client ID.

Nunca poner en el código ni en el repositorio el Client secret ni claves `service_role`.
