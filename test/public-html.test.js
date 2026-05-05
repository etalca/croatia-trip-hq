const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');

test('flight form exposes a copy-flight selector before manual flight fields without an extra button', () => {
  assert.match(html, /id="copyFlightsFrom"/);
  assert.doesNotMatch(html, /id="copyFlightsButton"/);
  assert.match(html, /Copy flight details from someone else/);
  assert.ok(
    html.indexOf('id="copyFlightsFrom"') > html.indexOf('id="flightStatus"'),
    'copy control should appear after flight status',
  );
  assert.ok(
    html.indexOf('id="copyFlightsFrom"') < html.indexOf('id="arrivalDate"'),
    'copy control should appear before the manual arrival/departure fields',
  );
});

test('copy-flight logic copies flight fields but not notes or current guest name', () => {
  assert.match(html, /const copyFlightKeys=\['flightStatus','arrivalDate','arrivalAirport','arrivalTime','arrivalFlight','departureDate','departureAirport','departureTime','departureFlight'\]/);
  assert.doesNotMatch(html, /copyFlightKeys=\[[^\]]*flightNotes/);
  assert.match(html, /function copyFlightDetailsFrom\(name\)/);
  assert.match(html, /copyFlightsFrom\.addEventListener\('change',\(\)=>copyFlightDetailsFrom\(copyFlightsFrom\.value\)\)/);
});

test('hero video is configured for Safari-friendly autoplay on load', () => {
  assert.match(html, /<video id="waterVideo"[^>]*src="assets\/hero-water-3-browser\.mp4"[^>]*muted[^>]*playsinline[^>]*autoplay/);
  assert.match(html, /video\.defaultMuted=true; video\.muted=true; video\.playsInline=true; video\.autoplay=true;/);
  assert.match(html, /video\.setAttribute\('muted',''\)/);
  assert.match(html, /window\.addEventListener\('pageshow',nudgeVideo/);
  assert.match(html, /video\.play\(\)\.catch/);
});

test('trip info heading is personalized and todo chips show completion icons', () => {
  assert.doesNotMatch(html, />Trip dashboard<\/h2>/);
  assert.doesNotMatch(html, /Your home base for flights, dinner responsibilities, tasks, and the useful trip stuff\./);
  assert.match(html, /<h2 class="dashboard-name" id="dashboardGuestName">Your dashboard<\/h2>/);
  assert.match(html, /class="todo-chip/);
  assert.match(html, /function todoIcon\(done\)/);
  assert.match(html, /Dinner claimed/);
  assert.match(html, /Claim a dinner/);
  assert.match(html, /✓/);
  assert.match(html, /○/);
});

test('dinner claiming excludes checkout day and has no notes field', () => {
  assert.match(html, /id="dinnerForm"/);
  assert.match(html, /id="dinnerDate"/);
  assert.match(html, /id="dinnerPartner"/);
  assert.match(html, /id="dinnerPlanType"/);
  assert.doesNotMatch(html, /id="dinnerNotes"/);
  assert.doesNotMatch(html, /'2026-07-04'/);
  assert.doesNotMatch(html, /dinnerNotes/);
});
