const fs = require('node:fs');
const path = require('node:path');
const { Redis } = require('@upstash/redis');
const { canonicalCrewName, sendJson, getSupabase } = require('../lib/trip-store');
const { getAuthUserFromRequest, resolveGuestForAuthUser } = require('../lib/trip-auth');

const DEFAULT_LOCAL_GROCERIES_PATH = process.env.VERCEL ? path.join('/tmp', 'croatia-trip-hq-groceries.json') : path.join(process.cwd(), 'Server', 'groceries-data.json');
const LOCAL_GROCERIES_PATH = process.env.GROCERIES_DATA_PATH || DEFAULT_LOCAL_GROCERIES_PATH;
const REDIS_KEY = process.env.GROCERIES_DATA_KEY || 'croatia-trip-hq:groceries';
let redisClient;

function redisEnv() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return { url, token };
}
function getRedis() {
  const { url, token } = redisEnv();
  if (!url || !token) return null;
  if (!redisClient) redisClient = new Redis({ url, token });
  return redisClient;
}
function emptyGroceries() { return { preferences: {}, items: [] }; }
function normalizeGroceries(value) {
  const preferences = value?.preferences && typeof value.preferences === 'object' ? value.preferences : {};
  const cleanPreferences = {};
  for (const [name, note] of Object.entries(preferences)) {
    const person = canonicalCrewName(name);
    const text = String(note || '').trim().slice(0, 220);
    if (person && text) cleanPreferences[person] = text;
  }
  const items = Array.isArray(value?.items) ? value.items.map(item => {
    const addedBy = canonicalCrewName(item.addedBy || '') || '';
    const requestedBy = Array.from(new Set((Array.isArray(item.requestedBy) ? item.requestedBy : [])
      .map(name => canonicalCrewName(name || ''))
      .filter(Boolean)));
    if (addedBy && !requestedBy.length) requestedBy.push(addedBy);
    return {
      id: String(item.id || `grocery-${Date.now()}`).slice(0, 80),
      text: String(item.text || '').trim().slice(0, 80),
      addedBy,
      requestedBy,
      createdAt: String(item.createdAt || new Date().toISOString()).slice(0, 40),
    };
  }).filter(item => item.text).slice(0, 80) : [];
  return { preferences: cleanPreferences, items };
}
async function readGroceries() {
  const redis = getRedis();
  if (redis) return normalizeGroceries(await redis.get(REDIS_KEY) || emptyGroceries());
  try { return normalizeGroceries(JSON.parse(fs.readFileSync(LOCAL_GROCERIES_PATH, 'utf8'))); }
  catch { return emptyGroceries(); }
}
async function writeGroceries(groceries) {
  const next = normalizeGroceries(groceries);
  const redis = getRedis();
  if (redis) {
    await redis.set(REDIS_KEY, next);
    return next;
  }
  fs.mkdirSync(path.dirname(LOCAL_GROCERIES_PATH), { recursive: true });
  fs.writeFileSync(LOCAL_GROCERIES_PATH, JSON.stringify(next, null, 2) + '\n');
  return next;
}
async function requestPerson(req, body) {
  const supabase = getSupabase();
  if (supabase) {
    const user = await getAuthUserFromRequest(supabase, req);
    if (user) {
      const guest = await resolveGuestForAuthUser(supabase, user);
      if (guest?.name) return guest.name;
    }
  }
  return canonicalCrewName(body?.name || body?.person || '') || null;
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') return sendJson(res, 200, { ok: true, groceries: await readGroceries() });
    if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const person = await requestPerson(req, body);
    if (!person) return sendJson(res, 401, { ok: false, error: 'Confirm who you are first.' });
    const current = await readGroceries();
    const preferences = { ...current.preferences };
    const dietaryNotes = String(body.dietaryNotes || '').trim().slice(0, 220);
    if (dietaryNotes) preferences[person] = dietaryNotes;
    else delete preferences[person];
    const incomingItems = Array.isArray(body.items) ? body.items : current.items;
    const groceries = await writeGroceries({ preferences, items: incomingItems });
    return sendJson(res, 200, { ok: true, person, groceries });
  } catch (err) {
    console.error(err);
    return sendJson(res, err.statusCode || 500, { ok: false, error: err.statusCode ? err.message : 'Server error' });
  }
};

module.exports._private = { normalizeGroceries };
