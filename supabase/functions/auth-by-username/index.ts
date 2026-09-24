import { createClient } from 'npm:@supabase/supabase-js@2.117.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const publicAuth = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const allowedOrigins = new Set(['http://localhost:5173', 'http://127.0.0.1:5173', 'https://track.upstream.land']);
const usernamePattern = /^[a-z0-9][a-z0-9._-]{2,31}$/;
const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8' };

function reply(status: number, body: Record<string, unknown>, origin: string | null) {
  const headers = new Headers(jsonHeaders);
  if (origin && allowedOrigins.has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Vary', 'Origin');
    headers.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type, x-session-token');
    headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  }
  return new Response(JSON.stringify(body), { status, headers });
}

async function getEmailForUsername(username: string) {
  const { data: mapping, error: mappingError } = await service
    .from('baby_usernames')
    .select('user_id')
    .eq('username', username)
    .maybeSingle();
  if (mappingError) throw mappingError;
  if (!mapping) return null;
  const { data, error } = await service.auth.admin.getUserById(mapping.user_id);
  if (error) throw error;
  return data.user?.email ?? null;
}

function sessionResponse(session: { access_token: string; refresh_token: string } | null) {
  if (!session) return reply(500, { error: 'Could not create a sign-in session.' }, null);
  return { access_token: session.access_token, refresh_token: session.refresh_token };
}

Deno.serve(async request => {
  const origin = request.headers.get('origin');
  if (request.method === 'OPTIONS') {
    if (!origin || !allowedOrigins.has(origin)) return new Response(null, { status: 403 });
    const preflight = reply(200, {}, origin);
    return new Response(null, { status: 204, headers: preflight.headers });
  }
  if (request.method !== 'POST') return reply(405, { error: 'Method not allowed.' }, origin);
  if (origin && !allowedOrigins.has(origin)) return reply(403, { error: 'Origin not allowed.' }, null);

  try {
    const input = await request.json();
    const action = input?.action;
    if (action === 'get-username') {
      const token = request.headers.get('x-session-token');
      if (!token) return reply(401, { error: 'Sign in to continue.' }, origin);
      const { data: authData, error: authError } = await service.auth.getUser(token);
      if (authError || !authData.user) return reply(401, { error: 'Sign in to continue.' }, origin);
      const { data: mapping, error: mappingError } = await service
        .from('baby_usernames')
        .select('username')
        .eq('user_id', authData.user.id)
        .maybeSingle();
      if (mappingError) throw mappingError;
      if (!mapping) return reply(404, { error: 'User ID not found.' }, origin);
      return reply(200, { username: mapping.username }, origin);
    }

    const username = typeof input?.username === 'string' ? input.username.trim().toLowerCase() : '';
    if (!usernamePattern.test(username)) return reply(400, { error: 'Enter a valid user ID.' }, origin);

    if (action === 'sign-in') {
      const email = await getEmailForUsername(username);
      if (!email || typeof input.password !== 'string') {
        return reply(401, { error: 'Invalid user ID or password.' }, origin);
      }
      const { data, error } = await publicAuth.auth.signInWithPassword({ email, password: input.password });
      if (error || !data.session) return reply(401, { error: 'Invalid user ID or password.' }, origin);
      return reply(200, sessionResponse(data.session), origin);
    }

    if (action === 'sign-up') {
      const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
      const password = typeof input?.password === 'string' ? input.password : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply(400, { error: 'Enter a valid email.' }, origin);
      if (password.length < 6 || password.length > 128) return reply(400, { error: 'Password must be 6 to 128 characters.' }, origin);
      const existingEmail = await getEmailForUsername(username);
      if (existingEmail) return reply(409, { error: 'That user ID is already taken.' }, origin);

      const { data: created, error: createError } = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username },
      });
      if (createError || !created.user) return reply(400, { error: 'Could not create account with those details.' }, origin);

      const { error: insertError } = await service.from('baby_usernames').insert({
        user_id: created.user.id,
        username,
      });
      if (insertError) {
        await service.auth.admin.deleteUser(created.user.id);
        const usernameTaken = insertError.code === '23505';
        return reply(usernameTaken ? 409 : 500, {
          error: usernameTaken ? 'That user ID is already taken.' : 'Could not create account. Try again.',
        }, origin);
      }

      const { data, error } = await publicAuth.auth.signInWithPassword({ email, password });
      if (error || !data.session) return reply(500, { error: 'Account created. Sign in to continue.' }, origin);
      return reply(200, sessionResponse(data.session), origin);
    }

    if (action === 'reset-password') {
      const email = await getEmailForUsername(username);
      if (email) {
        const redirectTo = typeof input?.redirectTo === 'string' && allowedOrigins.has(input.redirectTo)
          ? input.redirectTo
          : 'http://localhost:5173';
        await publicAuth.auth.resetPasswordForEmail(email, { redirectTo });
      }
      return reply(200, { message: 'If that user ID exists, reset instructions were sent.' }, origin);
    }

    return reply(400, { error: 'Unknown authentication action.' }, origin);
  } catch (error) {
    console.error('Username auth request failed:', error);
    return reply(500, { error: 'Authentication is temporarily unavailable. Try again.' }, origin);
  }
});
