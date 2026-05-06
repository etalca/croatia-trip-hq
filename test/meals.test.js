const test = require('node:test');
const assert = require('node:assert/strict');

const { _private } = require('../api/meals');

const meals = {
  slots: [
    { date: '2026-06-27', leads: ['Tanner', 'David'], planType: 'cook', title: 'Seafood night' },
    { date: '2026-06-28', leads: [], planType: 'undecided', title: '' },
  ],
};

test('dinnerAssignmentError allows the current guest to edit or move their own dinner', () => {
  assert.equal(_private.dinnerAssignmentError(meals, 'Tanner', 'Jacob G.', '2026-06-27'), '');
  assert.equal(_private.dinnerAssignmentError(meals, 'Tanner', 'Mikaela', '2026-06-28'), '');
});

test('dinnerAssignmentError names a co-lead who is already assigned', () => {
  assert.equal(
    _private.dinnerAssignmentError(meals, 'Jacob G.', 'David'),
    'David has already been assigned to a dinner.',
  );
});

test('dinnerAssignmentError allows two unassigned guests', () => {
  assert.equal(_private.dinnerAssignmentError(meals, 'Jacob G.', 'Mikaela'), '');
});


test('dinnerAssignmentError allows editing with an existing co-lead on the same responsibility', () => {
  assert.equal(_private.dinnerAssignmentError(meals, 'Tanner', 'David', '2026-06-27'), '');
});

test('saveLocalMeal clears the current guest dinner when requested', () => {
  const oldPath = process.env.MEALS_DATA_PATH;
  const tmpPath = require('node:path').join(require('node:os').tmpdir(), `meals-clear-${Date.now()}.json`);
  process.env.MEALS_DATA_PATH = tmpPath;
  delete require.cache[require.resolve('../api/meals')];
  const fresh = require('../api/meals')._private;
  require('node:fs').writeFileSync(tmpPath, JSON.stringify(meals));
  const next = fresh.saveLocalMeal('Tanner', { clear: true });
  assert.deepEqual(next.slots.find(slot => slot.date === '2026-06-27').leads, []);
  assert.equal(next.slots.some(slot => (slot.leads || []).includes('Tanner')), false);
  if (oldPath === undefined) delete process.env.MEALS_DATA_PATH; else process.env.MEALS_DATA_PATH = oldPath;
  delete require.cache[require.resolve('../api/meals')];
});

test('saveLocalMeal lets the current guest edit their own dinner without duplicate error', () => {
  const oldPath = process.env.MEALS_DATA_PATH;
  const tmpPath = require('node:path').join(require('node:os').tmpdir(), `meals-edit-${Date.now()}.json`);
  process.env.MEALS_DATA_PATH = tmpPath;
  delete require.cache[require.resolve('../api/meals')];
  const fresh = require('../api/meals')._private;
  require('node:fs').writeFileSync(tmpPath, JSON.stringify(meals));
  const next = fresh.saveLocalMeal('Tanner', { date: '2026-06-28', partner: 'Mikaela', planType: 'other', title: 'Market night' });
  assert.deepEqual(next.slots.find(slot => slot.date === '2026-06-27').leads, []);
  assert.deepEqual(next.slots.find(slot => slot.date === '2026-06-28').leads, ['Tanner', 'Mikaela']);
  if (oldPath === undefined) delete process.env.MEALS_DATA_PATH; else process.env.MEALS_DATA_PATH = oldPath;
  delete require.cache[require.resolve('../api/meals')];
});

test('Supabase dinner rows can round-trip Other even before the database constraint is migrated', () => {
  assert.deepEqual(
    _private.supabasePlanFields('other'),
    { plan_type: 'other', notes: '' },
  );
  assert.deepEqual(
    _private.supabasePlanFields('other', { legacyConstraintFallback: true }),
    { plan_type: 'undecided', notes: '__plan_type:other__' },
  );
  assert.equal(
    _private.planTypeFromSupabaseRow({ plan_type: 'undecided', notes: '__plan_type:other__' }),
    'other',
  );
  assert.deepEqual(
    _private.normalizeMeals({ slots: [{ date: '2026-06-27', plan_type: 'undecided', notes: '__plan_type:other__' }] }).slots[0],
    { date: '2026-06-27', leads: [], planType: 'other', title: '', notes: '' },
  );
});

test('dinner plan type migrations allow Other in the database constraint', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  const sql = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort()
    .map(file => fs.readFileSync(path.join(migrationsDir, file), 'utf8'))
    .join('\n');

  assert.match(sql, /drop constraint if exists dinner_slots_plan_type_check/i);
  assert.match(sql, /check \(plan_type in \('reservation', 'cook', 'undecided', 'other'\)\)/i);
});
