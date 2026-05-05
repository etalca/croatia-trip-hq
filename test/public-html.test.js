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

test('hero video is configured for aggressive autoplay on load', () => {
  assert.match(html, /<video id="waterVideo"[^>]*autoplay/);
  assert.match(html, /video\.muted=true; video\.playsInline=true; video\.autoplay=true;/);
  assert.match(html, /video\.play\(\)\.catch/);
});

test('trip info is a personalized dashboard with a close x and dinner planning controls', () => {
  assert.match(html, /id="closeTripInfo"[^>]*aria-label="Close"[^>]*>×<\/button>/);
  assert.match(html, /id="dashboardGuestName"/);
  assert.match(html, /id="myDinnerCard"/);
  assert.match(html, /id="dinnerBoard"/);
  assert.match(html, /id="dinnerForm"/);
  assert.match(html, /id="dinnerDate"/);
  assert.match(html, /id="dinnerPartner"/);
  assert.match(html, /id="dinnerPlanType"/);
});
