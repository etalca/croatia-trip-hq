const { CREW, getSupabase, sendJson } = require('../../lib/trip-store');
const { claimGuestForAuthUser, getAuthUserFromRequest } = require('../../lib/trip-auth');

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    const supabase = getSupabase();
    if (!supabase) return sendJson(res, 503, { ok: false, error: 'Supabase is not configured' });
    const user = await getAuthUserFromRequest(supabase, req);
    if (!user) return sendJson(res, 401, { ok: false, error: 'Sign in again to continue.' });
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const requestedName = CREW.find(person => person.toLowerCase() === String(body.name || '').trim().toLowerCase()) || '';
    const guest = await claimGuestForAuthUser(supabase, user, requestedName);
    return sendJson(res, 200, { ok: true, guest });
  } catch (err) {
    console.error(err);
    return sendJson(res, err.statusCode || 500, { ok: false, error: err.statusCode ? err.message : 'Server error' });
  }
};
