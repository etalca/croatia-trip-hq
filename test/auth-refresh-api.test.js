const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const refreshPath = path.join(__dirname, '..', 'api', 'auth', 'refresh.js');
const refreshSource = fs.existsSync(refreshPath) ? fs.readFileSync(refreshPath, 'utf8') : '';

test('auth refresh endpoint rotates a stored Supabase refresh token into a fresh session', () => {
  assert.ok(fs.existsSync(refreshPath), 'api/auth/refresh.js should exist');
  assert.match(refreshSource, /req\.method !== 'POST'/);
  assert.match(refreshSource, /refreshToken/);
  assert.match(refreshSource, /supabase\.auth\.refreshSession\(\{ refresh_token: refreshToken \}\)/);
  assert.match(refreshSource, /accessToken: session\.access_token/);
  assert.match(refreshSource, /refreshToken: session\.refresh_token/);
  assert.match(refreshSource, /expiresAt: session\.expires_at/);
});
