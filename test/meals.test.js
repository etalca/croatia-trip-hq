const test = require('node:test');
const assert = require('node:assert/strict');

const { _private } = require('../api/meals');

const meals = {
  slots: [
    { date: '2026-06-27', leads: ['Tanner', 'David'], planType: 'cook', title: 'Seafood night' },
    { date: '2026-06-28', leads: [], planType: 'undecided', title: '' },
  ],
};

test('dinnerAssignmentError tells current guest they are already assigned', () => {
  assert.equal(
    _private.dinnerAssignmentError(meals, 'Tanner', 'Jacob G.'),
    'You have already been assigned to a dinner.',
  );
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
