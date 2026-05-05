const fs = require('node:fs');
const path = require('node:path');

const CREW = ['Tanner','David','Jacob G.','Jacob M.','Mikaela','Candace','Kaelin','Mark','Amanda','Ellie','Erika','Andie','Zach','Kait','Nick'];
const EMPTY_DB = { guests: {}, flights: {} };
const LOCAL_DB_PATH = process.env.DATA_PATH || path.join(process.cwd(), 'Server', 'trip-data.json');
const REDIS_KEY = process.env.TRIP_DATA_KEY || 'croatia-trip-hq:trip-data';

let supabaseClient;
let redisClient;

function supabaseEnv() {
  return {
    url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY,
  };
}
function hasSupabaseEnv() {
  const { url, key } = supabaseEnv();
  return Boolean(url && key);
}
function getSupabase() {
  if (!hasSupabaseEnv()) return null;
  if (!supabaseClient) {
    const { createClient } = require('@supabase/supabase-js');
    const { url, key } = supabaseEnv();
    supabaseClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return supabaseClient;
}

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

function rowToFlight(row) {
  if (!row) return null;
  return {
    name: row.guest_name,
    flightStatus: row.flight_status || '',
    arrivalDate: row.arrival_date || '',
    arrivalAirport: row.arrival_airport || '',
    arrivalTime: row.arrival_time || '',
    arrivalFlight: row.arrival_flight || '',
    departureDate: row.departure_date || '',
    departureAirport: row.departure_airport || '',
    departureTime: row.departure_time || '',
    departureFlight: row.departure_flight || '',
    flightNotes: row.flight_notes || '',
    updatedAt: row.updated_at,
  };
}

async function readSupabaseDb(supabase) {
  const [tokensResult, flightsResult] = await Promise.all([
    supabase.from('guest_access_tokens').select('token, trip_guests(name)'),
    supabase.from('flight_details').select('*'),
  ]);
  if (tokensResult.error) throw tokensResult.error;
  if (flightsResult.error) throw flightsResult.error;

  const db = { guests: {}, flights: {} };
  for (const tokenRow of tokensResult.data || []) {
    const name = tokenRow.trip_guests?.name;
    if (tokenRow.token && name) db.guests[tokenRow.token] = { name };
  }
  for (const flightRow of flightsResult.data || []) {
    db.flights[flightRow.identity_key] = rowToFlight(flightRow);
  }
  return normalizeDb(db);
}

async function upsertSupabaseFlight(supabase, identityKey, record) {
  const { data: guest, error: guestError } = await supabase
    .from('trip_guests')
    .select('id')
    .eq('name', record.name)
    .maybeSingle();
  if (guestError) throw guestError;

  const row = {
    identity_key: identityKey,
    guest_id: guest?.id || null,
    guest_name: record.name,
    flight_status: record.flightStatus || '',
    arrival_date: record.arrivalDate || '',
    arrival_airport: record.arrivalAirport || '',
    arrival_time: record.arrivalTime || '',
    arrival_flight: record.arrivalFlight || '',
    departure_date: record.departureDate || '',
    departure_airport: record.departureAirport || '',
    departure_time: record.departureTime || '',
    departure_flight: record.departureFlight || '',
    flight_notes: record.flightNotes || '',
    updated_at: record.updatedAt || new Date().toISOString(),
  };
  const { error } = await supabase.from('flight_details').upsert(row, { onConflict: 'identity_key' });
  if (error) throw error;
}

async function writeSupabaseDb(supabase, db) {
  const next = normalizeDb(db);

  for (const person of CREW) {
    const { error } = await supabase.from('trip_guests').upsert({ name: person }, { onConflict: 'name' });
    if (error) throw error;
  }

  const { data: existingRows, error: existingError } = await supabase.from('flight_details').select('identity_key');
  if (existingError) throw existingError;
  const wanted = new Set(Object.keys(next.flights || {}));
  const stale = (existingRows || []).map(row => row.identity_key).filter(key => !wanted.has(key));
  if (stale.length) {
    const { error } = await supabase.from('flight_details').delete().in('identity_key', stale);
    if (error) throw error;
  }

  for (const [identityKey, record] of Object.entries(next.flights || {})) {
    if (record?.name) await upsertSupabaseFlight(supabase, identityKey, record);
  }
  return next;
}

async function readDb() {
  const supabase = getSupabase();
  if (supabase) return readSupabaseDb(supabase);

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
  const supabase = getSupabase();
  if (supabase) return writeSupabaseDb(supabase, next);

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
function storageMode() {
  if (hasSupabaseEnv()) return 'supabase';
  if (hasRedisEnv()) return 'upstash';
  return 'filesystem';
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
  storageMode,
};
