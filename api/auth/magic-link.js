const { CREW, getSupabase, sendJson } = require('../../lib/trip-store');
const { normalizeEmail } = require('../../lib/trip-auth');

function siteOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://croatia-trip-hq.vercel.app';
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    const supabase = getSupabase();
    if (!supabase) return sendJson(res, 503, { ok: false, error: 'Magic links are not configured yet.' });

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const name = String(body.name || '').trim();
    const email = normalizeEmail(body.email);
    if (!CREW.includes(name)) return sendJson(res, 400, { ok: false, error: 'Choose your name first.' });
    if (!email || !email.includes('@')) return sendJson(res, 400, { ok: false, error: 'Add a good email address so we can send your magic link.' });

    const redirectTo = `${siteOrigin(req)}/?claim=${encodeURIComponent(name)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
    });
    if (error) throw error;
    return sendJson(res, 200, { ok: true });
  } catch (err) {
    console.error(err);
    return sendJson(res, err.statusCode || 500, { ok: false, error: err.statusCode ? err.message : 'Could not send magic link yet.' });
  }
};
