import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string) || 'https://hkcvtoozpeybwehqtiif.supabase.co';
export const SUPABASE_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  'sb_publishable_CGTFNipWN_1IeG28m4upSg_n2HSsGai';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export interface ApiErrorPayload {
  error?: string;
  code?: string;
  message?: string;
}

export async function parseSupabaseError(error: any): Promise<string> {
  if (!error) return 'An unexpected error occurred.';

  let message = '';
  try {
    if (error.context && typeof error.context.json === 'function') {
      const errorJson = await error.context.json();
      message = errorJson.message || errorJson.error || '';
    }
  } catch {
    // fall through to standard error properties
  }

  return message || error.message || 'An unexpected error occurred.';
}

export interface SessionResult {
  ok: boolean;
  /** Set when sign-in failed for a reason the UI should explain, e.g. the
   *  project's "Allow anonymous sign-ins" toggle is off. */
  reason?: 'anonymous_disabled' | 'unknown';
}

/**
 * Ensures the current visitor has a Supabase auth session (anonymous by
 * default), so every play counts toward a profile/streak from the first
 * guess — mirrors the When & Where auth pattern. Never throws: callers
 * check `ok` and branch on `reason` instead of landing on a raw
 * "Not authenticated" error from the first RPC call.
 */
export async function ensureSession(): Promise<SessionResult> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return { ok: true };

  const { error } = await supabase.auth.signInAnonymously();
  if (!error) return { ok: true };

  const code = (error as any)?.code || '';
  const msg = error.message || '';
  if (code === 'anonymous_provider_disabled' || /anonymous sign-ins are disabled/i.test(msg)) {
    return { ok: false, reason: 'anonymous_disabled' };
  }
  return { ok: false, reason: 'unknown' };
}
