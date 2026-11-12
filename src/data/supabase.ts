import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Conexión con el proyecto de Supabase (la nube).
 *
 * La URL y la clave «publishable» son públicas por diseño: van dentro de la
 * app y lo que protege los datos es la seguridad por filas (RLS) de la base
 * de datos, que solo deja a cada usuario ver y tocar lo suyo. Nunca se pone
 * aquí la clave «service_role» ni la «secret».
 */
export const SUPABASE_URL = 'https://oggbdljjuydctazkujnz.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_UhebA4ELUKbhSaInjL0ILA_nF7N2A_d';

export const isCloudConfigured = SUPABASE_URL.startsWith('https://') && SUPABASE_KEY.length > 0;

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Entramos con email y contraseña, no por redirección, así que no hay que
    // leer la sesión de la URL (y así no interfiere dentro del APK).
    detectSessionInUrl: false,
  },
});
