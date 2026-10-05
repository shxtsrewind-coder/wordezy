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

/**
 * Ensures the current visitor has a Supabase auth session (anonymous by
 * default), so every play counts toward a profile/streak from the first
 * guess — mirrors the When & Where auth pattern.
 */
export async function ensureSession(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    await supabase.auth.signInAnonymously();
  }
}
