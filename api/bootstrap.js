const { CREW, readDb, canonicalCrewName, safeGuest, flightForPerson, publicBoard, sendJson } = require('../lib/trip-store');

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    const db = await readDb();
    const token = req.query?.token || '';
    const requestedName = canonicalCrewName(req.query?.name || '');
    const guest = safeGuest(db, token);
    const person = guest?.name || requestedName || null;
    const flights = guest ? db.flights[token] || flightForPerson(db, guest.name) : (requestedName ? flightForPerson(db, requestedName) : null);
    return sendJson(res, 200, { ok: true, known: !!person, person, flights, board: publicBoard(db), crew: CREW });
  } catch (err) {
    console.error(err);
    return sendJson(res, 500, { ok: false, error: 'Server error' });
  }
};
