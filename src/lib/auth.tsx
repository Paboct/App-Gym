import type { Session, User } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { loadLastSync, syncNow } from '../data/sync';
import { supabase } from '../data/supabase';

interface AuthValue {
  session: Session | null;
  user: User | null;
  ready: boolean;
  signIn(email: string, password: string): Promise<{ error?: string }>;
  signUp(email: string, password: string): Promise<{ error?: string; needsConfirmation?: boolean }>;
  signInWithGoogle(): Promise<{ error?: string; cancelled?: boolean }>;
  signOut(): Promise<void>;
}

/** Cliente OAuth «Aplicación web» del proyecto de Google Cloud (público por diseño). */
const GOOGLE_WEB_CLIENT_ID = '85980743056-ilgru23mm82uqtt759aa2d03auiaah74.apps.googleusercontent.com';

/** El inicio de sesión con Google es nativo: solo existe dentro del APK. */
export const googleAvailable = Capacitor.isNativePlatform();

let googleReady: Promise<void> | null = null;
function initGoogle(): Promise<void> {
  googleReady ??= SocialLogin.initialize({
    google: { webClientId: GOOGLE_WEB_CLIENT_ID, skipAuthOnlyAuthorizationAfterSignIn: true },
  });
  return googleReady;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
      if (data.session) {
        loadLastSync();
        void syncNow();
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next) void syncNow();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Sincroniza al volver a la app (otra pantalla puede haber añadido datos).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncNow();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? { error: error.message } : {};
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) return { error: error.message };
    return { needsConfirmation: !data.session };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      await initGoogle();
      const res = await SocialLogin.login({ provider: 'google', options: {} });
      const result = res.result as { idToken?: string | null };
      if (!result.idToken) return { error: 'Google no devolvió el token de acceso.' };
      const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: result.idToken });
      return error ? { error: error.message } : {};
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/cancel/i.test(msg)) return { cancelled: true };
      googleReady = null;
      return { error: msg };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      if (googleAvailable) await SocialLogin.logout({ provider: 'google' });
    } catch {
      /* no había sesión de Google que cerrar */
    }
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, ready, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fuera de AuthProvider');
  return ctx;
}
