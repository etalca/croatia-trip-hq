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

test('trip info heading is a friendly greeting and todo chips show completion icons', () => {
  assert.doesNotMatch(html, />Trip dashboard<\/h2>/);
  assert.doesNotMatch(html, /Your home base for flights, dinner responsibilities, tasks, and the useful trip stuff\./);
  assert.match(html, /<h2 class="dashboard-name" id="dashboardGuestName">Hi<\/h2>/);
  assert.match(html, /`Hi, \${name}`/);
  assert.doesNotMatch(html, /\$\{name\}’s trip dashboard/);
  assert.match(html, /<button class="todo-chip/);
  assert.match(html, /function todoIcon\(done\)/);
  assert.match(html, /Dinner claimed/);
  assert.match(html, /Claim a dinner/);
  assert.match(html, /Add to calendar/);
  assert.match(html, /✓/);
  assert.match(html, /○/);
});

test('undone todo chips are visually ordered before completed todos', () => {
  assert.match(html, /\.todo-chip:not\(\.done\) \{ order: 1; \}/);
  assert.match(html, /\.todo-chip\.done \{[^}]*order: 2;/s);
});

test('dinner claiming and dinner plans are separate windows, not stuffed into the main dashboard', () => {
  assert.match(html, /id="dinnerPicker"/);
  assert.match(html, /aria-labelledby="dinnerPickerTitle"/);
  assert.match(html, /id="closeDinnerPicker"/);
  assert.match(html, /id="dinnerPlans"/);
  assert.match(html, /aria-labelledby="dinnerPlansTitle"/);
  assert.match(html, /id="openDinnerPlans"/);
  assert.match(html, /function openDinnerPlans\(\)/);
  assert.match(html, /function closeDinnerPlans\(\)/);
  assert.match(html, /function openDinnerPicker\(\)/);
  assert.match(html, /function closeDinnerPicker\(\)/);
  assert.ok(
    html.indexOf('id="dinnerPicker"') > html.indexOf('id="tripInfo"'),
    'dinner picker should be a separate modal after the main trip dashboard',
  );
  assert.ok(
    html.indexOf('id="dinnerPlans"') > html.indexOf('id="dinnerPicker"'),
    'dinner plans should be a separate modal after the dinner picker',
  );
  const tripInfoBlock = html.slice(html.indexOf('id="tripInfo"'), html.indexOf('id="dinnerPicker"'));
  assert.doesNotMatch(tripInfoBlock, /id="dinnerForm"/);
  assert.doesNotMatch(tripInfoBlock, /id="dinnerDate"/);
  assert.doesNotMatch(tripInfoBlock, /id="dinnerBoard"/);
});

test('todo chips and dashboard cards route to the right detail windows', () => {
  assert.match(html, /flightStatusChip\.addEventListener\('click',\(\)=>\{ if\(savedFlights\(\)\) openDashboard\(\); else openDialog\('tripInfo'\); \}\)/);
  assert.match(html, /dinnerStatusChip\.addEventListener\('click',openDinnerPicker\)/);
  assert.match(html, /calendarStatusChip\.addEventListener\('click',addTripToCalendar\)/);
  assert.match(html, /openDinnerPlansButton\.addEventListener\('click',openDinnerPlans\)/);
});

test('main dashboard summarizes only the current guest dinner and replaces Calendar card with Dinner plans', () => {
  const tripInfoBlock = html.slice(html.indexOf('id="tripInfo"'), html.indexOf('id="dinnerPicker"'));
  assert.match(tripInfoBlock, /id="myDinnerMeta"/);
  assert.match(html, /You’re responsible for dinner plans on/);
  assert.match(tripInfoBlock, /<button class="info-card" id="openDinnerPlans" type="button"><span>Dinner plans<\/span>/);
  assert.doesNotMatch(tripInfoBlock, /id="tripInfoCalendar"/);
  assert.doesNotMatch(tripInfoBlock, /<span>Calendar<\/span>/);
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
