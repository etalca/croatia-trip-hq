const { getSupabase, sendJson } = require('../../lib/trip-store');
const { getAuthUserFromRequest, resolveGuestForAuthUser } = require('../../lib/trip-auth');

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    const supabase = getSupabase();
    if (!supabase) return sendJson(res, 200, { ok: true, guest: null });
    const user = await getAuthUserFromRequest(supabase, req);
    if (!user) return sendJson(res, 200, { ok: true, guest: null });
    const guest = await resolveGuestForAuthUser(supabase, user);
    return sendJson(res, 200, { ok: true, guest });
  } catch (err) {
    console.error(err);
    return sendJson(res, err.statusCode || 500, { ok: false, error: err.statusCode ? err.message : 'Server error' });
  }
};
