function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function rowToGuest(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: normalizeEmail(row.email),
    authUserId: row.auth_user_id || null,
  };
}

function assertAuthUser(authUser) {
  const id = String(authUser?.id || '').trim();
  const email = normalizeEmail(authUser?.email);
  if (!id || !email) {
    const err = new Error('Sign in again to continue.');
    err.statusCode = 401;
    throw err;
  }
  return { id, email };
}

async function resolveGuestForAuthUser(supabase, authUser) {
  const user = assertAuthUser(authUser);

  const byAuth = await supabase
    .from('trip_guests')
    .select('id,name,email,auth_user_id')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (byAuth.error) throw byAuth.error;
  if (byAuth.data) return rowToGuest(byAuth.data);

  const byEmail = await supabase
    .from('trip_guests')
    .select('id,name,email,auth_user_id')
    .ilike('email', user.email)
    .maybeSingle();
  if (byEmail.error) throw byEmail.error;
  if (!byEmail.data) return null;
  if (byEmail.data.auth_user_id && byEmail.data.auth_user_id !== user.id) return null;

  const linked = await supabase
    .from('trip_guests')
    .update({ auth_user_id: user.id, email: user.email })
    .eq('id', byEmail.data.id)
    .select('id,name,email,auth_user_id')
    .single();
  if (linked.error) throw linked.error;
  return rowToGuest(linked.data);
}

async function claimGuestForAuthUser(supabase, authUser, requestedName) {
  const user = assertAuthUser(authUser);
  const name = String(requestedName || '').trim();
  if (!name) {
    const err = new Error('Choose your name to claim your profile.');
    err.statusCode = 400;
    throw err;
  }

  const existing = await resolveGuestForAuthUser(supabase, user);
  if (existing) {
    if (existing.name !== name) {
      const err = new Error(`You are already signed in as ${existing.name}.`);
      err.statusCode = 409;
      throw err;
    }
    return existing;
  }

  const selected = await supabase
    .from('trip_guests')
    .select('id,name,email,auth_user_id')
    .eq('name', name)
    .maybeSingle();
  if (selected.error) throw selected.error;
  if (!selected.data) {
    const err = new Error('That trip profile was not found.');
    err.statusCode = 404;
    throw err;
  }
  if (selected.data.auth_user_id || selected.data.email) {
    const err = new Error(`${selected.data.name} has already been claimed.`);
    err.statusCode = 409;
    throw err;
  }

  const linked = await supabase
    .from('trip_guests')
    .update({ email: user.email, auth_user_id: user.id })
    .eq('id', selected.data.id)
    .select('id,name,email,auth_user_id')
    .single();
  if (linked.error) throw linked.error;
  return rowToGuest(linked.data);
}

function bearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || '';
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

async function getAuthUserFromRequest(supabase, req) {
  const token = bearerToken(req);
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error) {
    const err = new Error('Sign in again to continue.');
    err.statusCode = 401;
    throw err;
  }
  return data?.user || null;
}

module.exports = {
  normalizeEmail,
  rowToGuest,
  resolveGuestForAuthUser,
  claimGuestForAuthUser,
  bearerToken,
  getAuthUserFromRequest,
};
