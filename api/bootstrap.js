const { CREW, readDb, canonicalCrewName, safeGuest, flightForPerson, publicBoard, sendJson, getSupabase } = require('../lib/trip-store');
const { getAuthUserFromRequest, resolveGuestForAuthUser } = require('../lib/trip-auth');

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    const db = await readDb();
    let authGuest = null;
    const supabase = getSupabase();
    if (supabase) {
      const user = await getAuthUserFromRequest(supabase, req);
      if (user) authGuest = await resolveGuestForAuthUser(supabase, user);
    }
    const token = req.query?.token || '';
    const requestedName = canonicalCrewName(req.query?.name || '');
    const guest = safeGuest(db, token);
    const person = authGuest?.name || guest?.name || requestedName || null;
    const flights = authGuest ? flightForPerson(db, authGuest.name) : (guest ? db.flights[token] || flightForPerson(db, guest.name) : (requestedName ? flightForPerson(db, requestedName) : null));
    return sendJson(res, 200, { ok: true, known: !!person, person, guest: authGuest, flights, board: publicBoard(db), crew: CREW });
  } catch (err) {
    console.error(err);
    return sendJson(res, err.statusCode || 500, { ok: false, error: err.statusCode ? err.message : 'Server error' });
  }
};
