const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const WEB = path.join(ROOT, 'Website');
const DB_PATH = process.env.DATA_PATH || path.join(__dirname, 'trip-data.json');
const PORT = Number(process.env.PORT || 8787);

const CREW = ['Tanner','David','Jacob G.','Jacob M.','Mikaela','Candace','Kaelin','Mark','Amanda','Ellie','Erika','Andie','Zach','Kait','Nick'];

function readDb() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
  catch { return { guests: {}, flights: {} }; }
}
function ensureDbDir() { fs.mkdirSync(path.dirname(DB_PATH), { recursive: true }); }
function writeDb(db) {
  ensureDbDir();
  const tmp = DB_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2) + '\n');
  fs.renameSync(tmp, DB_PATH);
}
function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1_000_000) { req.destroy(); reject(new Error('Body too large')); }
    });
    req.on('end', () => resolve(body ? JSON.parse(body) : {}));
    req.on('error', reject);
  });
}
function safeGuest(db, token) {
  if (!token || typeof token !== 'string') return null;
  return db.guests[token] || null;
}
function canonicalCrewName(name) {
  const raw = String(name || '').trim();
  return CREW.find(person => person.toLowerCase() === raw.toLowerCase()) || '';
}
function nameKey(name) { return `name:${name}`; }
function flightForPerson(db, name) {
  const exact = db.flights?.[nameKey(name)];
  if (exact) return exact;
  for (const record of Object.values(db.flights || {})) {
    if (record?.name === name) return record;
  }
  return null;
}
function publicBoard(db) {
  const byName = {};
  for (const person of CREW) {
    const record = flightForPerson(db, person);
    if (record) byName[person] = { ...record, name: person };
  }
  for (const [token, guest] of Object.entries(db.guests || {})) {
    const record = db.flights?.[token];
    if (guest?.name && record) byName[guest.name] = { ...record, name: guest.name };
  }
  return byName;
}
function sanitizeFlight(input, guestName) {
  const allowed = ['flightStatus','arrivalDate','arrivalAirport','arrivalTime','arrivalFlight','departureDate','departureAirport','departureTime','departureFlight','flightNotes'];
  const out = { name: guestName };
  for (const key of allowed) out[key] = String(input?.[key] ?? '').slice(0, 500).trim();
  return out;
}
function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.normalize(path.join(WEB, pathname));
  if (!filePath.startsWith(WEB)) return sendJson(res, 403, { error: 'Forbidden' });
  fs.readFile(filePath, (err, data) => {
    if (err) return sendJson(res, 404, { error: 'Not found' });
    const ext = path.extname(filePath).toLowerCase();
    const type = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.mp4':'video/mp4', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png', '.svg':'image/svg+xml' }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'content-type': type, 'cache-control': ext === '.html' ? 'no-store' : 'public, max-age=3600' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === 'GET' && url.pathname === '/api/health') return sendJson(res, 200, { ok: true });
    if (req.method === 'GET' && url.pathname === '/api/bootstrap') {
      const db = readDb();
      const token = url.searchParams.get('token') || '';
      const requestedName = canonicalCrewName(url.searchParams.get('name') || '');
      const guest = safeGuest(db, token);
      const person = guest?.name || requestedName || null;
      const flights = guest ? db.flights[token] || flightForPerson(db, guest.name) : (requestedName ? flightForPerson(db, requestedName) : null);
      return sendJson(res, 200, { ok: true, known: !!person, person, flights, board: publicBoard(db), crew: CREW });
    }
    if (req.method === 'POST' && url.pathname === '/api/flights') {
      const body = await readBody(req);
      const db = readDb();
      const token = body.token || '';
      const guest = safeGuest(db, token);
      const submittedName = canonicalCrewName(body.name || body.data?.name || '');
      const person = guest?.name || submittedName;
      if (!person) return sendJson(res, 400, { ok: false, error: 'Choose a valid trip guest' });
      const identityKey = guest ? token : nameKey(person);
      const record = sanitizeFlight(body.data || {}, person);
      db.flights[identityKey] = { ...record, updatedAt: new Date().toISOString() };
      writeDb(db);
      return sendJson(res, 200, { ok: true, person, flights: db.flights[identityKey], board: publicBoard(db) });
    }
    serveStatic(req, res);
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { ok: false, error: 'Server error' });
  }
});

server.listen(PORT, () => {
  console.log(`Croatia Trip HQ running at http://127.0.0.1:${PORT}`);
});
