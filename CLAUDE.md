# Legacy (App-Gym) — contexto para Claude

App de entrenamientos por mesociclos. React + TypeScript + Vite, empaquetada en Android con
Capacitor. Datos locales en IndexedDB (Dexie), nube en Supabase. Idioma de trabajo: español.

- Estado y decisiones: `docs/ESPECIFICACION.md` (léelo primero). Planes y diseños de
  funciones: `docs/superpowers/{specs,plans}/`.
- **1.0.0 cerrada** (17-nov-2026) y en `main`; **1.1.0** (KPIs, catálogo con activación y
  comparación) casi lista. Se habla siempre de versiones MAYOR.MENOR.PARCHE (SemVer; reglas en
  `docs/ESPECIFICACION.md`, «Versiones»): nada de «v2». Afinar los umbrales de rango está en el backlog.
- Catálogo y su pipeline de datos: `data/catalogo/` (fuente `ejercicios.json`, 35 músculos con
  activación). Mapas corporales: `src/assets/body/*.svg`, generados a `src/data/bodyArt.ts` con
  `scripts/catalogo/generar-bodyart.mjs`; `src/data/catalog.json` sale de `generar-catalog-json.mjs`.
- Migración `0004_exercise_muscles.sql` ya aplicada en Supabase (18-nov-2026).
- Comandos: `npm test`, `npm run typecheck`, `npm run android:sync` (compila y copia a
  `android/`), `npm run android:assets` (iconos desde `public/logo.svg`).
- Probar en el móvil: Android Studio → Run con el OPPO A94 conectado por USB. Si
  `cap open` no abre nada, lanzar `C:\Program Files\Android\Android Studio\bin\studio64.exe`
  con la carpeta `android\`.
- Supabase: proyecto **Legacy** (`oggbdljjuydctazkujnz`), organización «Paboct». Migraciones
  aplicadas a mano. Google Cloud: proyecto `app-gimnasio-515008`.
- Nunca poner Client secret de Google ni claves `service_role` en el código.
- Windows: los archivos son CRLF y git avisa al commitear; es normal.
- Commits en español, con el `Co-Authored-By` indicado por el sistema.
