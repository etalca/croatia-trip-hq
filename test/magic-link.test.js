const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'api', 'auth', 'magic-link.js'), 'utf8');
const supabaseConfig = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'config.toml'), 'utf8');

test('magic-link handler forces the Croatia subdomain instead of deployment aliases', () => {
  assert.match(source, /const preferredOrigin = 'https:\/\/croatia\.tannerbegin\.com'/);
  assert.doesNotMatch(source, /process\.env\.NEXT_PUBLIC_SITE_URL \|\| process\.env\.SITE_URL/);
  assert.match(source, /isLocalHost\(host\)/);
  assert.doesNotMatch(source, /tanbeige\.com/);
});

test('Supabase auth allows magic-link redirects to the Croatia subdomain', () => {
  assert.match(supabaseConfig, /site_url = "https:\/\/croatia\.tannerbegin\.com"/);
  assert.match(supabaseConfig, /"https:\/\/croatia\.tannerbegin\.com"/);
  assert.match(supabaseConfig, /"https:\/\/croatia\.tannerbegin\.com\/\*"/);
  assert.doesNotMatch(supabaseConfig, /tanbeige\.com/);
});
