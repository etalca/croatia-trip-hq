const fs = require('node:fs');
const path = require('node:path');

const CREW = ['Tanner','David','Jacob G.','Jacob M.','Mikaela','Candace','Kaelin','Mark','Amanda','Ellie','Erika','Andie','Zach','Kait','Nick'];
const EMPTY_DB = { guests: {}, flights: {} };
const LOCAL_DB_PATH = process.env.DATA_PATH || path.join(process.cwd(), 'Server', 'trip-data.json');
const REDIS_KEY = process.env.TRIP_DATA_KEY || 'croatia-trip-hq:trip-data';

let redisClient;
function redisEnv() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return { url, token };
}
function hasRedisEnv() {
  const { url, token } = redisEnv();
  return Boolean(url && token);
}
function getRedis() {
  if (!hasRedisEnv()) return null;
  if (!redisClient) {
    const { Redis } = require('@upstash/redis');
    const { url, token } = redisEnv();
    redisClient = new Redis({ url, token });
  }
  return redisClient;
}
function normalizeDb(value) {
  if (!value || typeof value !== 'object') return { ...EMPTY_DB, guests: {}, flights: {} };
  return {
    guests: value.guests && typeof value.guests === 'object' ? value.guests : {},
    flights: value.flights && typeof value.flights === 'object' ? value.flights : {},
  };
}
async function readDb() {
  const redis = getRedis();
  if (redis) {
    const value = await redis.get(REDIS_KEY);
    return normalizeDb(value || EMPTY_DB);
  }
  try { return normalizeDb(JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf8'))); }
  catch { return normalizeDb(EMPTY_DB); }
}
async function writeDb(db) {
  const next = normalizeDb(db);
  const redis = getRedis();
  if (redis) {
    await redis.set(REDIS_KEY, next);
    return next;
  }
  fs.mkdirSync(path.dirname(LOCAL_DB_PATH), { recursive: true });
  const tmp = LOCAL_DB_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2) + '\n');
  fs.renameSync(tmp, LOCAL_DB_PATH);
  return next;
}
function canonicalCrewName(name) {
  const raw = String(name || '').trim();
  return CREW.find(person => person.toLowerCase() === raw.toLowerCase()) || '';
}
function nameKey(name) { return `name:${name}`; }
function safeGuest(db, token) {
  if (!token || typeof token !== 'string') return null;
  return db.guests[token] || null;
}
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
function sendJson(res, status, value) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(value));
}
module.exports = {
  CREW,
  readDb,
  writeDb,
  canonicalCrewName,
  safeGuest,
  flightForPerson,
  publicBoard,
  sanitizeFlight,
  sendJson,
  storageMode: () => hasRedisEnv() ? 'upstash' : 'filesystem',
};
