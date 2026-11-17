# Legacy (App-Gym) — contexto para Claude

App de entrenamientos por mesociclos. React + TypeScript + Vite, empaquetada en Android con
Capacitor. Datos locales en IndexedDB (Dexie), nube en Supabase. Idioma de trabajo: español.

- Estado y decisiones: `docs/ESPECIFICACION.md` (léelo primero). Planes y diseños de
  funciones: `docs/superpowers/{specs,plans}/`.
- **v1 cerrada** (17-nov-2026) y en `main`. La v2 de KPIs ya está casi toda hecha; solo
  falta comparar dos mesociclos y afinar los umbrales de rango.
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
