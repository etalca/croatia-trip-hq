const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeEmail, claimGuestForAuthUser, resolveGuestForAuthUser } = require('../lib/trip-auth');

function createGuestStore(rows) {
  const state = { trip_guests: rows.map(row => ({ ...row })), updates: [] };
  const makeBuilder = () => {
    const builder = {
      _table: '',
      _update: null,
      _filters: [],
      from(table) { this._table = table; return this; },
      select() { return this; },
      update(values) { this._update = values; return this; },
      eq(column, value) { this._filters.push({ column, value }); return this; },
      ilike(column, value) { this._filters.push({ column, value, ilike: true }); return this; },
      async maybeSingle() {
        let rows = state[this._table] || [];
        for (const filter of this._filters) {
          rows = rows.filter(row => {
            const current = row[filter.column];
            if (filter.ilike) return String(current || '').toLowerCase() === String(filter.value || '').toLowerCase();
            return current === filter.value;
          });
        }
        const row = rows[0] || null;
        return { data: row ? { ...row } : null, error: null };
      },
      async single() {
        if (this._update) {
          let rows = state[this._table] || [];
          for (const filter of this._filters) rows = rows.filter(row => row[filter.column] === filter.value);
          const row = rows[0];
          if (!row) return { data: null, error: { message: 'not found' } };
          Object.assign(row, this._update);
          state.updates.push({ table: this._table, values: this._update, row: { ...row } });
          return { data: { ...row }, error: null };
        }
        return this.maybeSingle();
      },
    };
    return builder;
  };
  return { state, supabase: { from: table => makeBuilder().from(table) } };
}

test('normalizeEmail lowercases and trims email before matching', () => {
  assert.equal(normalizeEmail('  TANNER@Example.COM  '), 'tanner@example.com');
});

test('claimGuestForAuthUser binds an unclaimed existing trip guest row', async () => {
  const { supabase, state } = createGuestStore([{ id: 'guest-1', name: 'Tanner', email: null, auth_user_id: null }]);

  const guest = await claimGuestForAuthUser(supabase, { id: 'auth-1', email: 'Tanner@Example.com' }, 'Tanner');

  assert.deepEqual(guest, { id: 'guest-1', name: 'Tanner', email: 'tanner@example.com', authUserId: 'auth-1' });
  assert.equal(state.trip_guests[0].email, 'tanner@example.com');
  assert.equal(state.trip_guests[0].auth_user_id, 'auth-1');
});

test('claimGuestForAuthUser refuses to overwrite a profile claimed by someone else', async () => {
  const { supabase } = createGuestStore([{ id: 'guest-1', name: 'Tanner', email: 'old@example.com', auth_user_id: 'auth-old' }]);

  await assert.rejects(
    claimGuestForAuthUser(supabase, { id: 'auth-new', email: 'new@example.com' }, 'Tanner'),
    /already been claimed/i,
  );
});

test('resolveGuestForAuthUser finds an existing linked profile by auth user id', async () => {
  const { supabase } = createGuestStore([{ id: 'guest-1', name: 'Tanner', email: 'tanner@example.com', auth_user_id: 'auth-1' }]);

  const guest = await resolveGuestForAuthUser(supabase, { id: 'auth-1', email: 'tanner@example.com' });

  assert.deepEqual(guest, { id: 'guest-1', name: 'Tanner', email: 'tanner@example.com', authUserId: 'auth-1' });
});
