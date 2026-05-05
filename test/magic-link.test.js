const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'api', 'auth', 'magic-link.js'), 'utf8');

test('magic-link redirects prefer the Croatia subdomain instead of deployment aliases', () => {
  assert.match(source, /https:\/\/croatia\.tannerbegin\.com/);
  assert.match(source, /function siteOrigin\(req\)/);
  assert.match(source, /isLocalHost\(host\)/);
  assert.match(source, /return preferredOrigin/);
  assert.doesNotMatch(source, /tanbeige\.com/);
});
