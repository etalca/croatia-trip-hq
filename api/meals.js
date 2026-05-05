const fs = require('node:fs');
const path = require('node:path');
const { CREW, canonicalCrewName, safeGuest, sendJson, getSupabase } = require('../lib/trip-store');
const { getAuthUserFromRequest, resolveGuestForAuthUser } = require('../lib/trip-auth');

const DINNER_DATES = ['2026-06-27','2026-06-28','2026-06-29','2026-06-30','2026-07-01','2026-07-02','2026-07-03'];
const LOCAL_MEALS_PATH = process.env.MEALS_DATA_PATH || path.join(process.cwd(), 'Server', 'meals-data.json');

function emptyMeals() {
  return { slots: DINNER_DATES.map(date => ({ date, leads: [], planType: 'undecided', title: '', notes: '' })) };
}
function normalizePlanType(value) {
  return ['reservation', 'cook', 'undecided'].includes(value) ? value : 'undecided';
}
function normalizeMeals(value) {
  const byDate = new Map((value?.slots || []).map(slot => [slot.date, slot]));
  return {
    slots: DINNER_DATES.map(date => {
      const slot = byDate.get(date) || {};
      return {
        date,
        leads: Array.isArray(slot.leads) ? slot.leads.filter(Boolean).slice(0, 3) : [],
        planType: normalizePlanType(slot.planType),
        title: String(slot.title || '').slice(0, 120),
        notes: String(slot.notes || '').slice(0, 500),
      };
    }),
  };
}
function dinnerAssignmentError(meals, person, partner) {
  const slots = normalizeMeals(meals).slots;
  if (person && slots.some(slot => (slot.leads || []).includes(person))) {
    return 'You have already been assigned to a dinner.';
  }
  if (partner && slots.some(slot => (slot.leads || []).includes(partner))) {
    return `${partner} has already been assigned to a dinner.`;
  }
  return '';
}
function assertDinnerAssignmentAvailable(meals, person, partner) {
  const message = dinnerAssignmentError(meals, person, partner);
  if (message) throw Object.assign(new Error(message), { statusCode: 409 });
}
async function ensureSupabaseSlots(supabase) {
  const rows = DINNER_DATES.map(date => ({ dinner_date: date, plan_type: 'undecided' }));
  const { error } = await supabase.from('dinner_slots').upsert(rows, { onConflict: 'dinner_date', ignoreDuplicates: true });
  if (error) throw error;
}
async function readSupabaseMeals(supabase) {
  await ensureSupabaseSlots(supabase);
  const [slotsResult, signupsResult] = await Promise.all([
    supabase.from('dinner_slots').select('id,dinner_date,title,notes,plan_type').order('dinner_date'),
    supabase.from('dinner_signups').select('dinner_slot_id,guest_name,role,created_at').eq('role', 'cook').order('created_at'),
  ]);
  if (slotsResult.error) throw slotsResult.error;
  if (signupsResult.error) throw signupsResult.error;
  const leadsBySlot = new Map();
  for (const row of signupsResult.data || []) {
    const list = leadsBySlot.get(row.dinner_slot_id) || [];
    if (!list.includes(row.guest_name)) list.push(row.guest_name);
    leadsBySlot.set(row.dinner_slot_id, list);
  }
  return normalizeMeals({
    slots: (slotsResult.data || []).map(slot => ({
      date: slot.dinner_date,
      leads: leadsBySlot.get(slot.id) || [],
      planType: slot.plan_type || 'undecided',
      title: slot.title || '',
      notes: slot.notes || '',
    })),
  });
}
function readLocalMeals() {
  try { return normalizeMeals(JSON.parse(fs.readFileSync(LOCAL_MEALS_PATH, 'utf8'))); }
  catch { return emptyMeals(); }
}
function writeLocalMeals(meals) {
  fs.mkdirSync(path.dirname(LOCAL_MEALS_PATH), { recursive: true });
  fs.writeFileSync(LOCAL_MEALS_PATH, JSON.stringify(normalizeMeals(meals), null, 2) + '\n');
  return normalizeMeals(meals);
}
async function authPerson(req, supabase, body) {
  if (supabase) {
    const user = await getAuthUserFromRequest(supabase, req);
    if (!user) return null;
    const guest = await resolveGuestForAuthUser(supabase, user);
    return guest?.name || null;
  }
  return canonicalCrewName(body?.name || '') || canonicalCrewName(body?.person || '') || null;
}
async function saveSupabaseMeal(supabase, person, body) {
  await ensureSupabaseSlots(supabase);
  const date = DINNER_DATES.includes(body.date) ? body.date : '';
  const partner = canonicalCrewName(body.partner || '');
  if (!date || !partner || partner === person) throw Object.assign(new Error('Choose a dinner night and co-lead.'), { statusCode: 400 });
  const planType = normalizePlanType(body.planType);
  const title = String(body.title || '').trim().slice(0, 120);
  assertDinnerAssignmentAvailable(await readSupabaseMeals(supabase), person, partner);
  const { data: slot, error: slotError } = await supabase
    .from('dinner_slots')
    .upsert({ dinner_date: date, title, notes: '', plan_type: planType }, { onConflict: 'dinner_date' })
    .select('id')
    .single();
  if (slotError) throw slotError;
  const leads = [person, partner];
  const { error: clearError } = await supabase.from('dinner_signups').delete().eq('role', 'cook').in('guest_name', leads);
  if (clearError) throw clearError;
  const rows = leads.map(guestName => ({ dinner_slot_id: slot.id, guest_name: guestName, role: 'cook', notes: '' }));
  const { error: insertError } = await supabase.from('dinner_signups').insert(rows);
  if (insertError) throw insertError;
  return readSupabaseMeals(supabase);
}
function saveLocalMeal(person, body) {
  const date = DINNER_DATES.includes(body.date) ? body.date : '';
  const partner = canonicalCrewName(body.partner || '');
  if (!date || !partner || partner === person) throw Object.assign(new Error('Choose a dinner night and co-lead.'), { statusCode: 400 });
  const meals = readLocalMeals();
  assertDinnerAssignmentAvailable(meals, person, partner);
  const slot = meals.slots.find(s => s.date === date);
  slot.leads = [person, partner];
  slot.planType = normalizePlanType(body.planType);
  slot.title = String(body.title || '').trim().slice(0, 120);
  slot.notes = '';
  return writeLocalMeals(meals);
}

module.exports = async function handler(req, res) {
  try {
    const supabase = getSupabase();
    if (req.method === 'GET') {
      const meals = supabase ? await readSupabaseMeals(supabase) : readLocalMeals();
      return sendJson(res, 200, { ok: true, meals });
    }
    if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const person = await authPerson(req, supabase, body);
    if (!person) return sendJson(res, 401, { ok: false, error: 'Confirm who you are first.' });
    const meals = supabase ? await saveSupabaseMeal(supabase, person, body) : saveLocalMeal(person, body);
    return sendJson(res, 200, { ok: true, person, meals });
  } catch (err) {
    console.error(err);
    return sendJson(res, err.statusCode || 500, { ok: false, error: err.statusCode ? err.message : 'Server error' });
  }
};

module.exports._private = { DINNER_DATES, normalizeMeals, dinnerAssignmentError, saveLocalMeal };
