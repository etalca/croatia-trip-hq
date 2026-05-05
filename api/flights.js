const { readDb, writeDb, canonicalCrewName, safeGuest, publicBoard, sanitizeFlight, sendJson, getSupabase } = require('../lib/trip-store');
const { getAuthUserFromRequest, resolveGuestForAuthUser } = require('../lib/trip-auth');

function nameKey(name) { return `name:${name}`; }

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const db = await readDb();
    let authGuest = null;
    const supabase = getSupabase();
    if (supabase) {
      const user = await getAuthUserFromRequest(supabase, req);
      if (user) authGuest = await resolveGuestForAuthUser(supabase, user);
      if (!authGuest) return sendJson(res, 401, { ok: false, error: 'Confirm who you are first.' });
    }
    const token = body.token || '';
    const guest = safeGuest(db, token);
    const submittedName = canonicalCrewName(body.name || body.data?.name || '');
    const person = authGuest?.name || guest?.name || submittedName;
    if (!person) return sendJson(res, 401, { ok: false, error: 'Confirm who you are first.' });
    const identityKey = authGuest ? nameKey(authGuest.name) : (guest ? token : nameKey(person));
    const record = sanitizeFlight(body.data || {}, person);
    const hasFlightDetails = Object.entries(record).some(([key, value]) => key !== 'name' && String(value || '').trim());
    if (hasFlightDetails) {
      db.flights[identityKey] = { ...record, updatedAt: new Date().toISOString() };
    } else {
      delete db.flights[identityKey];
    }
    await writeDb(db);
    return sendJson(res, 200, { ok: true, person, guest: authGuest, flights: db.flights[identityKey] || null, board: publicBoard(db) });
  } catch (err) {
    console.error(err);
    return sendJson(res, err.statusCode || 500, { ok: false, error: err.statusCode ? err.message : 'Server error' });
  }
};
