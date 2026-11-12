# Forja

App de registro de entrenamientos de gimnasio organizada por mesociclos y microciclos.
Funciona en Android (APK) y en cualquier navegador de escritorio con el mismo código.

> «Forja» es un nombre provisional. Para cambiarlo: `src/config.ts`, `index.html`,
> `public/manifest.webmanifest` y `capacitor.config.ts` (el `appId` es definitivo
> una vez publicada la app en Play Store).

## Qué hace (v0.1)

- **Rutina**: mesociclos con número de microciclos configurable, días en secuencia
  (Día 1, Día 2…), semana de descarga y variaciones de series y RIR por semana.
- **Ejercicios**: catálogo propio bilingüe (es/en) con músculos principales y
  secundarios, favoritos y ejercicios creados por ti. Mapa corporal de frente y
  espalda que resalta lo que trabaja cada día o ejercicio.
- **Entreno en vivo**: selector de serie, peso, repeticiones, RIR (8–10), dropsets
  de hasta 3 bajadas, series de aproximación, referencia de la semana anterior con
  sugerencia, temporizador de descanso con vibración, sustituir y reordenar ejercicios.
- **Resumen**: duración, volumen, récords de 1RM estimado (🏆) y comparación con la
  semana anterior.
- **Historial**: todos los mesociclos, su cuadrícula día × semana, récords por
  semana, duplicar como base y borrar.

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
**Actions** → última ejecución → artefacto `forja-debug-apk`).

Para compilarlo en local hace falta Android Studio (JDK 21):

```bash
npm run android:sync   # compila la web y la copia a android/
npm run android:open   # abre el proyecto en Android Studio
```

## Estructura

| Carpeta | Contenido |
| --- | --- |
| `src/domain` | Tipos, músculos y cálculos puros (1RM, volumen, récords, progresión) |
| `src/data` | Base de datos local (IndexedDB con Dexie), catálogo y operaciones |
| `src/components` | Mapa corporal, buscador de ejercicios, temporizador, controles |
| `src/screens` | Pantallas: rutina, día, entreno, resumen, historial, KPIs, perfil |
| `src/i18n` | Textos en español e inglés |
| `supabase/migrations` | Esquema de la base de datos en la nube (con seguridad por filas) |
| `android` | Proyecto nativo generado por Capacitor |
| `tests` | Tests unitarios (Vitest) |
