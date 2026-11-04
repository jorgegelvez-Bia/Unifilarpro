/**
 * Nube (Supabase): inicio de sesión por correo y sincronización automática.
 *
 * Sin las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY la app trabaja solo en el celular.
 * Con ellas: al iniciar sesión se suben los diagramas del celular y se bajan los de la nube;
 * después, cada cambio se sube solo (a los 2 s) y se revisa la nube cada minuto y al volver internet.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { create } from 'zustand';
import { useStore } from '@/store/diagram';
import { syncOnce, type Remote, type Row } from './engine';

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
// Lovable usa el nombre "PUBLISHABLE_KEY"; se aceptan los dos.
const KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string | undefined;

export const supabase: SupabaseClient | null = URL_ && KEY ? createClient(URL_, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;

export type CloudStatus = 'local' | 'out' | 'syncing' | 'ok' | 'offline' | 'error';
interface Cloud {
  status: CloudStatus;
  email: string;
  lastSync: number;
  error: string;
}
export const useCloud = create<Cloud>(() => ({ status: supabase ? 'out' : 'local', email: '', lastSync: 0, error: '' }));

/** Explica en palabras sencillas los errores más comunes. */
export function friendly(e: unknown): string {
  const m = String((e as any)?.message || e || '');
  const code = String((e as any)?.code || '');
  if (code === '42501' || /row-level security|permission denied/i.test(m)) return 'Tu correo no tiene permiso para guardar en la nube. Pídele al administrador que te dé acceso.';
  if (/signups not allowed|user not found/i.test(m)) return 'Ese correo no tiene acceso. Pídele al administrador que te invite.';
  if (/rate limit|too many/i.test(m)) return 'Se pidieron muchos correos seguidos. Espera unos minutos e inténtalo de nuevo.';
  if (/token has expired|token.*invalid|invalid.*(otp|token)/i.test(m)) return 'El código no es válido o ya venció. Pide uno nuevo.';
  if (/failed to fetch|network/i.test(m)) return 'No hay conexión con la nube. Tus cambios quedan guardados en el celular.';
  return 'No se pudo sincronizar: ' + m;
}

/** La tabla `diagrams` de Supabase (ver supabase/migrations). */
function supabaseRemote(sb: SupabaseClient, owner: string): Remote {
  return {
    async push(rows: Row[]) {
      for (let i = 0; i < rows.length; i += 200) {
        const part = rows.slice(i, i + 200).map((r) => ({ owner, id: r.id, data: r.data, updated: r.updated, deleted: r.deleted }));
        const { error } = await sb.from('diagrams').upsert(part, { onConflict: 'owner,id' });
        if (error) throw error;
      }
    },
    async pull(since: string) {
      const out: Row[] = [];
      for (let from = 0; ; from += 500) {
        const { data, error } = await sb.from('diagrams').select('id,data,updated,deleted,server_updated').gt('server_updated', since).order('server_updated', { ascending: true }).range(from, from + 499);
        if (error) throw error;
        out.push(...((data || []) as Row[]));
        if (!data || data.length < 500) return out;
      }
    },
  };
}

let owner = '';
let timer: ReturnType<typeof setTimeout> | null = null;
let running = false, again = false;

async function run() {
  if (!supabase || !owner) return;
  if (!navigator.onLine) return useCloud.setState({ status: 'offline' });
  if (running) { again = true; return; }
  running = true;
  useCloud.setState({ status: 'syncing', error: '' });
  try {
    const st = useStore.getState;
    await syncOnce(supabaseRemote(supabase, owner), () => ({ diagrams: st().diagrams, sync: st().sync }), (r) => st().applySync(r));
    useCloud.setState({ status: 'ok', lastSync: Date.now() });
  } catch (e) {
    useCloud.setState({ status: navigator.onLine ? 'error' : 'offline', error: friendly(e) });
    schedule(30_000); // se reintenta solo
  } finally {
    running = false;
    if (again) { again = false; schedule(0); }
  }
}

/** Sincroniza dentro de `ms` (si llegan más cambios, se espera a que paren). */
export function schedule(ms = 2000) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { timer = null; void run(); }, ms);
}

let started = false;
export function startSync() {
  if (started || !supabase) return;
  started = true;
  supabase.auth.onAuthStateChange((_ev, session) => {
    const u = session?.user;
    if (u) {
      if (u.id !== owner) { owner = u.id; useStore.getState().setSyncUser(u.id); schedule(0); }
      useCloud.setState({ email: u.email || '', status: useCloud.getState().status === 'out' ? 'syncing' : useCloud.getState().status });
    } else {
      owner = '';
      useCloud.setState({ status: 'out', email: '' });
    }
  });
  // Cada cambio pendiente se sube a los 2 s.
  useStore.subscribe((s, prev) => { if (owner && s.sync.dirty !== prev.sync.dirty && s.sync.dirty.length) schedule(2000); });
  window.addEventListener('online', () => schedule(0));
  window.addEventListener('offline', () => owner && useCloud.setState({ status: 'offline' }));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') schedule(0); });
  setInterval(() => { if (document.visibilityState === 'visible') schedule(0); }, 60_000);
}

/** Envía el correo para entrar (enlace + código de 6 dígitos). Solo correos con acceso. */
export async function sendLogin(email: string): Promise<string | null> {
  if (!supabase) return 'La nube no está configurada.';
  const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false, emailRedirectTo: location.origin } });
  return error ? friendly(error) : null;
}

/** Entra con el código de 6 dígitos que llegó al correo (sirve en la app instalada). */
export async function verifyCode(email: string, code: string): Promise<string | null> {
  if (!supabase) return 'La nube no está configurada.';
  const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
  return error ? friendly(error) : null;
}

export async function signOut() {
  await supabase?.auth.signOut();
}
