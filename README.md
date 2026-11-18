# Legacy

App de registro de entrenamientos de gimnasio organizada por mesociclos y microciclos.
Funciona en Android (APK) y en cualquier navegador de escritorio con el mismo código.

> *Build your legacy.* El nombre vive en `src/config.ts`, `index.html`,
> `public/manifest.webmanifest` y `capacitor.config.ts`. El `appId`
> (`com.paboct.legacy`) es definitivo una vez publicada la app en Play Store.

## Qué hace (v1)

- **Rutina**: mesociclos con número de microciclos configurable, días en secuencia
  (Día 1, Día 2…), semana de descarga y variaciones de series y RIR por semana.
- **Ejercicios**: catálogo propio bilingüe (es/en) de 240 ejercicios con fotos,
  con coeficiente de activación por músculo (35 músculos), favoritos y ejercicios creados por ti. Mapa
  corporal anatómico de frente y espalda que resalta lo que trabaja cada día o ejercicio.
- **Entreno en vivo**: selector de serie, peso, repeticiones, RIR (8–10), dropsets
  de hasta 3 bajadas, series de aproximación, referencia de la semana anterior con
  sugerencia, temporizador de descanso con vibración y aviso al terminar (notificación
  local), sustituir y reordenar ejercicios.
- **Resumen**: duración, volumen, récords de 1RM estimado (🏆) y comparación con la
  semana anterior.
- **Historial**: todos los mesociclos, su cuadrícula día × semana, récords por
  semana, duplicar como base y borrar.
- **KPIs**: rangos por grupo muscular sobre el mapa corporal (de Hierro a Legacy),
  volumen por microciclo, récords, series semanales y rachas.
- **Exportar a Excel** un mesociclo (rutina, entrenos y progreso con gráficas).
- **Nube**: sincronización con Supabase e inicio de sesión con email o Google.
  La app funciona siempre sin conexión.

Lo que falta y el plan completo están en [`docs/ESPECIFICACION.md`](docs/ESPECIFICACION.md).

## Desarrollo

Requisitos: Node 22 o superior.

```bash
npm install
npm run dev        # abre la app en http://localhost:5173
npm test           # tests de la lógica y de la capa de datos
npm run build      # comprueba tipos y genera dist/
```

## Android

El APK se compila solo en GitHub Actions con cada push a `main` (pestaña
**Actions** → última ejecución → artefacto `legacy-debug-apk`).

Para compilarlo en local hace falta Android Studio (JDK 21):

```bash
npm run android:sync   # compila la web y la copia a android/
npm run android:open   # abre el proyecto en Android Studio (si no abre, ver abajo)
npm run android:assets # regenera iconos y pantallas de arranque desde public/logo.svg
```

Si `android:open` no abre nada, define `CAPACITOR_ANDROID_STUDIO_PATH` con la ruta de
`studio64.exe` o abre la carpeta `android/` a mano desde Android Studio.

El inicio de sesión con Google solo funciona dentro del APK y exige que la huella SHA-1
de la firma esté registrada en el cliente Android de Google Cloud (ver
`docs/ESPECIFICACION.md`, sección 4).

## Estructura

| Carpeta | Contenido |
| --- | --- |
| `src/domain` | Tipos, músculos y cálculos puros (1RM, volumen, récords, progresión) |
| `src/data` | Base de datos local (IndexedDB con Dexie), catálogo y operaciones |
| `src/components` | Mapa corporal, buscador de ejercicios, temporizador, controles |
| `src/screens` | Pantallas: rutina, día, entreno, resumen, historial, KPIs, perfil |
| `src/lib` | Sesión (auth), ajustes, temporizador, aviso de descanso, exportación a Excel |
| `src/i18n` | Textos en español e inglés |
| `supabase/migrations` | Esquema de la base de datos en la nube (con seguridad por filas) |
| `android` | Proyecto nativo generado por Capacitor |
| `tests` | Tests unitarios (Vitest) |

## Créditos y licencias

- **Fotos de ejercicios:** [free-exercise-db](https://github.com/yuhonas/free-exercise-db), dominio público (Unlicense). Se redimensionan y se tiñen con `npm run images:build -- --src <clon>`; la tabla ejercicio → foto está en `scripts/exercise-image-map.json`.
- **Inicio de sesión con Google:** [`@capgo/capacitor-social-login`](https://github.com/Cap-go/capacitor-social-login) (MIT).
- **Exportación a Excel:** [ExcelJS](https://github.com/exceljs/exceljs) (MIT) para generar el `.xlsx` y [JSZip](https://github.com/Stuk/jszip) (MIT o GPL-3.0, se usa bajo MIT) para añadir las gráficas.
