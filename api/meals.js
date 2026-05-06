const fs = require('node:fs');
const path = require('node:path');
const { CREW, canonicalCrewName, safeGuest, sendJson, getSupabase } = require('../lib/trip-store');
const { getAuthUserFromRequest, resolveGuestForAuthUser } = require('../lib/trip-auth');

const DINNER_DATES = ['2026-06-27','2026-06-28','2026-06-29','2026-06-30','2026-07-01','2026-07-02','2026-07-03'];
const LOCAL_MEALS_PATH = process.env.MEALS_DATA_PATH || path.join(process.cwd(), 'Server', 'meals-data.json');
const OTHER_PLAN_TYPE_SENTINEL = '__plan_type:other__';

function emptyMeals() {
  return { slots: DINNER_DATES.map(date => ({ date, leads: [], planType: 'undecided', title: '', notes: '' })) };
}
function normalizePlanType(value) {
  return ['reservation', 'cook', 'undecided', 'other'].includes(value) ? value : 'undecided';
}
function supabasePlanFields(planType, options = {}) {
  const normalized = normalizePlanType(planType);
  if (normalized === 'other' && options.legacyConstraintFallback) return { plan_type: 'undecided', notes: OTHER_PLAN_TYPE_SENTINEL };
  return { plan_type: normalized, notes: '' };
}
function planTypeFromSupabaseRow(row) {
  if (row?.notes === OTHER_PLAN_TYPE_SENTINEL) return 'other';
  return normalizePlanType(row?.plan_type || 'undecided');
}
function isLegacyPlanTypeConstraintError(error) {
  return error?.code === '23514' && String(error?.message || '').includes('dinner_slots_plan_type_check');
}
function normalizeMeals(value) {
  const byDate = new Map((value?.slots || []).map(slot => [slot.date, slot]));
  return {
    slots: DINNER_DATES.map(date => {
      const slot = byDate.get(date) || {};
      return {
        date,
        leads: Array.isArray(slot.leads) ? slot.leads.filter(Boolean).slice(0, 3) : [],
        planType: planTypeFromSupabaseRow(slot.plan_type !== undefined ? slot : { plan_type: slot.planType, notes: slot.notes }),
        title: String(slot.title || '').slice(0, 120),
        notes: slot.notes === OTHER_PLAN_TYPE_SENTINEL ? '' : String(slot.notes || '').slice(0, 500),
      };
    }),
  };
}
function dinnerAssignmentError(meals, person, partner, date) {
  const slots = normalizeMeals(meals).slots;
  const currentSlot = person ? slots.find(slot => (slot.leads || []).includes(person)) : null;
  const partnerSlot = partner ? slots.find(slot => (slot.leads || []).includes(partner)) : null;
  if (partnerSlot && !(currentSlot && partnerSlot.date === currentSlot.date)) {
    return `${partner} has already been assigned to a dinner.`;
  }
  return '';
}
function assertDinnerAssignmentAvailable(meals, person, partner, date) {
  const message = dinnerAssignmentError(meals, person, partner, date);
  if (message) throw Object.assign(new Error(message), { statusCode: 409 });
}
function clearMealForPerson(meals, person) {
  const next = normalizeMeals(meals);
  const currentSlot = next.slots.find(slot => (slot.leads || []).includes(person));
  if (currentSlot) {
    currentSlot.leads = [];
    currentSlot.planType = 'undecided';
    currentSlot.title = '';
    currentSlot.notes = '';
  }
  return next;
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
      planType: planTypeFromSupabaseRow(slot),
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
async function clearSupabaseDinnerForPerson(supabase, person) {
  const meals = await readSupabaseMeals(supabase);
  const currentSlot = meals.slots.find(slot => (slot.leads || []).includes(person));
  if (!currentSlot) return meals;
  const { data: slot, error: slotError } = await supabase.from('dinner_slots').select('id').eq('dinner_date', currentSlot.date).single();
  if (slotError) throw slotError;
  const { error: signupError } = await supabase.from('dinner_signups').delete().eq('role', 'cook').eq('dinner_slot_id', slot.id);
  if (signupError) throw signupError;
  const { error: resetError } = await supabase.from('dinner_slots').update({ title: '', notes: '', plan_type: 'undecided' }).eq('id', slot.id);
  if (resetError) throw resetError;
  return readSupabaseMeals(supabase);
}
async function saveSupabaseMeal(supabase, person, body) {
  await ensureSupabaseSlots(supabase);
  if (body.clear) return clearSupabaseDinnerForPerson(supabase, person);
  const date = DINNER_DATES.includes(body.date) ? body.date : '';
  const partner = canonicalCrewName(body.partner || '');
  if (!date || !partner || partner === person) throw Object.assign(new Error('Choose a dinner night and co-lead.'), { statusCode: 400 });
  const planType = normalizePlanType(body.planType);
  const title = String(body.title || '').trim().slice(0, 120);
  const meals = await readSupabaseMeals(supabase);
  assertDinnerAssignmentAvailable(meals, person, partner, date);
  const currentSlot = meals.slots.find(slot => (slot.leads || []).includes(person));
  if (currentSlot) {
    const { data: oldSlot, error: oldSlotError } = await supabase.from('dinner_slots').select('id').eq('dinner_date', currentSlot.date).single();
    if (oldSlotError) throw oldSlotError;
    const { error: oldClearError } = await supabase.from('dinner_signups').delete().eq('role', 'cook').eq('dinner_slot_id', oldSlot.id);
    if (oldClearError) throw oldClearError;
    const { error: oldResetError } = await supabase.from('dinner_slots').update({ title: '', notes: '', plan_type: 'undecided' }).eq('id', oldSlot.id);
    if (oldResetError) throw oldResetError;
  }
  const planFields = supabasePlanFields(planType);
  const { data: slot, error: slotError } = await supabase
    .from('dinner_slots')
    .upsert({ dinner_date: date, title, ...planFields }, { onConflict: 'dinner_date' })
    .select('id')
    .single();
  if (slotError && !(planType === 'other' && isLegacyPlanTypeConstraintError(slotError))) throw slotError;
  const resolvedSlot = slotError ? await supabase
    .from('dinner_slots')
    .upsert({ dinner_date: date, title, ...supabasePlanFields(planType, { legacyConstraintFallback: true }) }, { onConflict: 'dinner_date' })
    .select('id')
    .single() : { data: slot, error: null };
  if (resolvedSlot.error) throw resolvedSlot.error;
  const leads = [person, partner];
  const { error: clearError } = await supabase.from('dinner_signups').delete().eq('role', 'cook').in('guest_name', leads);
  if (clearError) throw clearError;
  const rows = leads.map(guestName => ({ dinner_slot_id: resolvedSlot.data.id, guest_name: guestName, role: 'cook', notes: '' }));
  const { error: insertError } = await supabase.from('dinner_signups').insert(rows);
  if (insertError) throw insertError;
  return readSupabaseMeals(supabase);
}
function saveLocalMeal(person, body) {
  const meals = readLocalMeals();
  if (body.clear) return writeLocalMeals(clearMealForPerson(meals, person));
  const date = DINNER_DATES.includes(body.date) ? body.date : '';
  const partner = canonicalCrewName(body.partner || '');
  if (!date || !partner || partner === person) throw Object.assign(new Error('Choose a dinner night and co-lead.'), { statusCode: 400 });
  assertDinnerAssignmentAvailable(meals, person, partner, date);
  const currentSlot = meals.slots.find(s => (s.leads || []).includes(person));
  if (currentSlot) {
    currentSlot.leads = [];
    currentSlot.planType = 'undecided';
    currentSlot.title = '';
    currentSlot.notes = '';
  }
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

module.exports._private = { DINNER_DATES, normalizeMeals, dinnerAssignmentError, clearMealForPerson, saveLocalMeal, supabasePlanFields, planTypeFromSupabaseRow };
