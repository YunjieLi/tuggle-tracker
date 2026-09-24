import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

async function usernameAuth(action, fields) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const functionsJwt = import.meta.env.VITE_SUPABASE_FUNCTIONS_JWT;
  if (!functionsJwt) throw new Error('Username sign-in is not configured.');
  const { data, error } = await supabase.functions.invoke('auth-by-username', {
    body: { action, ...fields, redirectTo: window.location.origin },
    headers: { Authorization: `Bearer ${functionsJwt}` },
  });
  if (error) {
    let message = error.message;
    try {
      const body = await error.context?.json();
      if (body?.error) message = body.error;
    } catch { /* Use the function invocation message. */ }
    throw new Error(message || 'Something went wrong. Try again.');
  }
  if (data?.access_token && data?.refresh_token) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    if (sessionError) throw sessionError;
  }
  return data;
}

export function signInWithUsername(username, password) {
  return usernameAuth('sign-in', { username, password });
}

export function signUpWithUsername(username, email, password) {
  return usernameAuth('sign-up', { username, email, password });
}

export function sendPasswordReset(username) {
  return usernameAuth('reset-password', { username });
}

export async function getSignedInUsername() {
  if (!supabase) throw new Error('Supabase is not configured.');
  const functionsJwt = import.meta.env.VITE_SUPABASE_FUNCTIONS_JWT;
  if (!functionsJwt) throw new Error('Username lookup is not configured.');
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return null;
  const { data, error } = await supabase.functions.invoke('auth-by-username', {
    body: { action: 'get-username' },
    headers: {
      Authorization: `Bearer ${functionsJwt}`,
      'x-session-token': accessToken,
    },
  });
  if (error) throw error;
  return data?.username ?? null;
}

export function updatePassword(password) {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase.auth.updateUser({ password });
}

export function activityToRow(activity, userId) {
  const { id, kind, at, ...data } = activity;
  return {
    id,
    user_id: userId,
    kind,
    occurred_at: at,
    data,
  };
}

export function activityFromRow(row) {
  return { ...row.data, id: row.id, kind: row.kind, at: row.occurred_at };
}
