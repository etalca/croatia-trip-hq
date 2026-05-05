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
