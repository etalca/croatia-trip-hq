const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeGroceries } = require('../api/groceries')._private;

test('grocery API preserves plus-one requester names on items', () => {
  const groceries = normalizeGroceries({
    preferences: { Tanner: 'No shellfish' },
    items: [
      { id: 'eggs', text: 'Eggs', addedBy: 'Tanner', requestedBy: ['Tanner', 'Amanda', 'Not A Guest', 'Amanda'], createdAt: '2026-05-08T00:00:00.000Z' },
    ],
  });

  assert.deepEqual(groceries.items, [
    { id: 'eggs', text: 'Eggs', addedBy: 'Tanner', requestedBy: ['Tanner', 'Amanda'], createdAt: '2026-05-08T00:00:00.000Z' },
  ]);
});
