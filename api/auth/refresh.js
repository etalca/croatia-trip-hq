const { getSupabase, sendJson } = require('../../lib/trip-store');

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    const supabase = getSupabase();
    if (!supabase) return sendJson(res, 503, { ok: false, error: 'Auth refresh is not configured yet.' });

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const refreshToken = String(body.refreshToken || '').trim();
    if (!refreshToken) return sendJson(res, 400, { ok: false, error: 'Missing refresh token.' });

    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (error) throw error;
    const session = data?.session;
    if (!session?.access_token) return sendJson(res, 401, { ok: false, error: 'Sign in again to continue.' });

    return sendJson(res, 200, {
      ok: true,
      session: {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at,
      },
    });
  } catch (err) {
    console.error(err);
    return sendJson(res, err.statusCode || 401, { ok: false, error: 'Sign in again to continue.' });
  }
};
