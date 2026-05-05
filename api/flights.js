const { readDb, writeDb, canonicalCrewName, safeGuest, publicBoard, sanitizeFlight, sendJson } = require('../lib/trip-store');

function nameKey(name) { return `name:${name}`; }

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const db = await readDb();
    const token = body.token || '';
    const guest = safeGuest(db, token);
    const submittedName = canonicalCrewName(body.name || body.data?.name || '');
    const person = guest?.name || submittedName;
    if (!person) return sendJson(res, 400, { ok: false, error: 'Choose a valid trip guest' });
    const identityKey = guest ? token : nameKey(person);
    const record = sanitizeFlight(body.data || {}, person);
    const hasFlightDetails = Object.entries(record).some(([key, value]) => key !== 'name' && String(value || '').trim());
    if (hasFlightDetails) {
      db.flights[identityKey] = { ...record, updatedAt: new Date().toISOString() };
    } else {
      delete db.flights[identityKey];
    }
    await writeDb(db);
    return sendJson(res, 200, { ok: true, person, flights: db.flights[identityKey] || null, board: publicBoard(db) });
  } catch (err) {
    console.error(err);
    return sendJson(res, 500, { ok: false, error: 'Server error' });
  }
};
