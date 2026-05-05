const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');

test('flight form exposes a copy-flight control before manual flight fields', () => {
  assert.match(html, /id="copyFlightsFrom"/);
  assert.match(html, /id="copyFlightsButton"/);
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

test('copy-flight logic copies every flight field except the current guest name', () => {
  assert.match(html, /const copyFlightKeys=\['flightStatus','arrivalDate','arrivalAirport','arrivalTime','arrivalFlight','departureDate','departureAirport','departureTime','departureFlight','flightNotes'\]/);
  assert.match(html, /function copyFlightDetailsFrom\(name\)/);
  assert.match(html, /copyFlightKeys\.forEach\(key=>\{ if\(source\[key\] !== undefined\) fields\[key\]\.value=source\[key\]; \}\)/);
  assert.match(html, /copyFlightsFrom\.addEventListener\('change',\(\)=>copyFlightDetailsFrom\(copyFlightsFrom\.value\)\)/);
});
