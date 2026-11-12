import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base './' para que los recursos carguen igual en el navegador y dentro del APK (Capacitor).
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
