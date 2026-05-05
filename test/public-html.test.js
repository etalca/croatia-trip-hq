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

test('homepage countdown counts calendar midnights, not trip start hour', () => {
  assert.match(html, /const villaStartDate='2026-06-27'/);
  assert.match(html, /function daysUntilTrip\(now=new Date\(\)\)/);
  assert.match(html, /new Date\(now\.getFullYear\(\),now\.getMonth\(\),now\.getDate\(\)\)/);
  assert.doesNotMatch(html, /Math\.ceil\(Math\.max\(0, villaStart - new Date\(\)\) \/ 86400000\)/);
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
  assert.match(html, /myDinnerCard\.addEventListener\('click',openDinnerPicker\)/);
  assert.match(html, /calendarStatusChip\.addEventListener\('click',addTripToCalendar\)/);
  assert.match(html, /openDinnerPlansButton\.addEventListener\('click',openDinnerPlans\)/);
});

test('dinner summary card is a clickable dinner picker shortcut', () => {
  assert.match(html, /<button class="personal-card" id="myDinnerCard" type="button"/);
  assert.match(html, /myDinnerCard\.addEventListener\('click',openDinnerPicker\)/);
  assert.match(html, /myDinnerCard=document\.getElementById\('myDinnerCard'\)/);
});

test('claimed dinner card puts the prompt above, date as title, and co-lead below', () => {
  assert.match(html, /id="myDinnerKicker"/);
  assert.match(html, /myDinnerKicker\.textContent='You’re responsible for dinner on'/);
  assert.match(html, /myDinnerTitle\.textContent=longDinnerDate\(myDinner\.date\)/);
  assert.match(html, /myDinnerMeta\.textContent=`with \$\{partner\}`/);
  assert.doesNotMatch(html, /myDinnerMeta\.textContent=dinnerIdeaSummary\(myDinner, partner\)/);
});

test('main dashboard summarizes dinner, flight arrival, and dinner plans without villa cards', () => {
  const tripInfoBlock = html.slice(html.indexOf('id="tripInfo"'), html.indexOf('id="dinnerPicker"'));
  assert.match(tripInfoBlock, /id="myDinnerMeta"/);
  assert.match(tripInfoBlock, /id="myFlightCard"/);
  assert.match(html, /You’re responsible for dinner on/);
  assert.match(html, /You’re flight arrives in/);
  assert.match(html, /function flightCompanionSummary\(current, board\)/);
  assert.match(html, /function normalizedFlightNumber\(value\)/);
  assert.match(html, /normalizedFlightNumber\(item\.arrivalFlight\)===flightNumber/);
  assert.match(html, /myFlightTitle\.textContent=countdownFor\(flights,'arrivals'\)/);
  assert.match(tripInfoBlock, /<button class="info-card" id="openDinnerPlans" type="button"><span>Dinner plans<\/span>/);
  assert.doesNotMatch(tripInfoBlock, /id="tripInfoEditFlights"/);
  assert.doesNotMatch(tripInfoBlock, /<span>My flight details<\/span>/);
  assert.doesNotMatch(tripInfoBlock, /<span>Villa<\/span>/);
  assert.doesNotMatch(tripInfoBlock, /id="tripInfoCalendar"/);
  assert.doesNotMatch(tripInfoBlock, /<span>Calendar<\/span>/);
});

test('flight board edit button overlays before info icon without changing row columns', () => {
  assert.match(html, /\.arrival-row \{[^}]*position: relative;[^}]*grid-template-columns: minmax\(86px, 1fr\) minmax\(190px, 1\.45fr\) minmax\(86px, \.8fr\) minmax\(104px, \.72fr\) 25\.5px;/s);
  assert.match(html, /\.arrival-edit \{[^}]*position: absolute;[^}]*right: 41\.5px;[^}]*opacity: 0;/s);
  assert.match(html, /\.arrival-row:hover \.arrival-edit, \.arrival-row:focus-within \.arrival-edit/);
  assert.match(html, /\$\{editButton\}<button class="notes-toggle"/);
});

test('flight board shows edit button only on the logged-in user row', () => {
  assert.match(html, /\.arrival-edit/);
  assert.match(html, /const canEdit=person===currentGuest\?\.name/);
  assert.match(html, /canEdit \? `<button class="arrival-edit"/);
  assert.match(html, /arrivalsBoard\.querySelectorAll\('\.arrival-edit'\)\.forEach/);
  assert.match(html, /openDialog\('dashboard'\)/);
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

test('dinner plans cards use hierarchy, smaller dates, and hover claim or edit actions', () => {
  assert.match(html, /\.dinner-date \{[^}]*font-size: 11px;/s);
  assert.match(html, /\.dinner-date strong \{[^}]*font-size: 16px;/s);
  assert.match(html, /\.dinner-action \{[^}]*opacity: 0;/s);
  assert.match(html, /\.dinner-night:hover \.dinner-action, \.dinner-night:focus-within \.dinner-action/);
  assert.match(html, /const isMyDinner=\(slot\.leads \|\| \[\]\)\.includes\(currentGuest\?\.name\)/);
  assert.match(html, /const actionLabel=!claimed \? 'Claim' : isMyDinner \? 'Edit' : ''/);
  assert.match(html, /const details=claimed \? `<div class="dinner-plan">\$\{escapeHtml\(planLabel\(slot\.planType \|\| 'undecided'\)\)\}<\/div><div class="dinner-title">\$\{escapeHtml\(title\)\}<\/div>` : ''/);
  assert.match(html, /const leads=claimed \? \(slot\.leads \|\| \[\]\)\.join\(' \+ '\) : 'Open'/);
  assert.match(html, /dinnerBoard\.querySelectorAll\('\.dinner-action'\)\.forEach/);
  assert.match(html, /openDinnerPickerForDate\(btn\.dataset\.date\)/);
});

test('dinner form surfaces duplicate-assignment errors without closing the picker', () => {
  assert.match(html, /function dinnerAssignmentError\(currentName, partner\)/);
  assert.match(html, /You have already been assigned to a dinner\./);
  assert.match(html, /\$\{partner\} has already been assigned to a dinner\./);
  assert.match(html, /throw new Error\(data\.error \|\| `Could not save dinner night`\)/);
  assert.match(html, /catch\(err\)\{ console\.error\(err\); showToast\(err\.message \|\| 'Could not save dinner night'\); \}/);
});
