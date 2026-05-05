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
  assert.match(html, /Add trip to calendar/);
  assert.match(html, /<button class="pill secondary" id="addCalendar">Add to calendar<\/button>/);
  assert.match(html, /✓/);
  assert.match(html, /○/);
});

test('undone todo chips are visually ordered before completed todos', () => {
  assert.match(html, /\.todo-chip:not\(\.done\) \{ order: 1; \}/);
  assert.match(html, /\.todo-chip\.done \{[^}]*order: 2;/s);
});

test('homepage secondary CTA advances after calendar todo and falls back to trip playlist', () => {
  assert.match(html, /const PLAYLIST_URL='https:\/\/open\.spotify\.com\/playlist\/2uBX4f2a2rv5EpYqnaH9IZ\?si=GtftoEnUQhiGxhD0LN1BKg&pi=eGAKC1xtTIOAt&pt_success=1&nd=1&dlsi=f2098c13b62748e1'/);
  assert.match(html, /function nextHomeTodoCta\(\)/);
  assert.match(html, /return 'Add flight details'/);
  assert.match(html, /return 'Claim a dinner'/);
  assert.match(html, /return 'Add songs trip playlist'/);
  assert.match(html, /window\.open\(PLAYLIST_URL,'_blank','noreferrer'\)/);
  assert.match(html, /localStorage\.setItem\(CALENDAR_KEY,'true'\); renderTripDashboard\(\); setPrimaryCta\(\);/);
});

test('FaceTime call notice floats higher with four subtle lines and correct calendar invite', () => {
  assert.match(html, /<div class="planning-call"/);
  assert.match(html, /<span>Drop in\. Discuss deets\.<\/span><span>May 12, 2026<\/span><span>6:30 p\.m\. PDT<\/span><a href="#" id="addPlanningCall">Add to calendar<\/a>/);
  assert.match(html, /\.planning-call \{[^}]*top: calc\(36% - 50px\);[^}]*opacity: \.58;/s);
  assert.match(html, /\.planning-call a \{[^}]*color: inherit;[^}]*opacity: \.72;/s);
  assert.match(html, /\.planning-call a:hover, \.planning-call a:focus-visible \{[^}]*opacity: 1;/s);
  assert.match(html, /function addPlanningCallToCalendar\(\)/);
  assert.match(html, /SUMMARY:Croatia Group FaceTime/);
  assert.match(html, /DESCRIPTION:Someone will initiate a Group FaceTime from the group message to answer questions, put forward ideas, and discuss any missed details\./);
  assert.match(html, /DTSTART:20260513T013000Z/);
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
  assert.match(html, /function openDinnerPicker\(backTarget='tripInfo'\)/);
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

test('dashboard itinerary view uses a week-view calendar layout with core trip events', () => {
  const tripInfoBlock = html.slice(html.indexOf('id="tripInfo"'), html.indexOf('id="dinnerPicker"'));
  assert.match(tripInfoBlock, /id="openCalendarView"/);
  assert.match(tripInfoBlock, /<span>Itinerary<\/span><span>View an overview of what each day will hold\.<\/span>/);
  assert.match(html, /id="calendarView"/);
  assert.match(html, /aria-labelledby="calendarViewTitle"/);
  assert.match(html, /<h2 id="calendarViewTitle">Itinerary<\/h2>/);
  assert.match(html, /id="calendarItems"/);
  assert.match(html, /\.calendar-week \{/);
  assert.match(html, /\.calendar-day \{/);
  assert.match(html, /function renderCalendarView\(\)/);
  assert.match(html, /Check-in/);
  assert.match(html, /June 27, 2026|month:'long', day:'numeric', year:'numeric'/);
  assert.match(html, /3:00 p\.m\./);
  assert.match(html, /Checkout/);
  assert.match(html, /July 4, 2026|month:'long', day:'numeric', year:'numeric'/);
  assert.match(html, /10:00 a\.m\./);
  assert.match(html, /dinnerPlan\(\)\.slots\.filter\(slot=>\(slot\.leads \|\| \[\]\)\.length\)/);
  const calendarBlock = html.slice(html.indexOf('id="calendarView"'), html.indexOf('id="dashboard"'));
  assert.doesNotMatch(calendarBlock, /Flights/);
  assert.doesNotMatch(calendarBlock, /Villa/);
});

test('todo chips and dashboard cards route to the right detail windows', () => {
  assert.match(html, /flightStatusChip\.addEventListener\('click',\(\)=>\{ if\(savedFlights\(\)\) openDashboard\(\); else openDialog\('tripInfo'\); \}\)/);
  assert.match(html, /dinnerStatusChip\.addEventListener\('click',\(\)=>openDinnerPicker\('tripInfo'\)\)/);
  assert.match(html, /myDinnerCard\.addEventListener\('click',\(\)=>openDinnerPicker\('tripInfo'\)\)/);
  assert.match(html, /calendarStatusChip\.addEventListener\('click',addTripToCalendar\)/);
  assert.match(html, /openDinnerPlansButton\.addEventListener\('click',openDinnerPlans\)/);
  assert.match(html, /openCalendarViewButton\.addEventListener\('click',openCalendarView\)/);
});

test('dinner summary card is a clickable dinner picker shortcut', () => {
  assert.match(html, /<button class="personal-card" id="myDinnerCard" type="button"/);
  assert.match(html, /myDinnerCard\.addEventListener\('click',\(\)=>openDinnerPicker\('tripInfo'\)\)/);
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
  assert.match(tripInfoBlock, /id="openCalendarView"/);
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
  const dinnerDatesDecl = html.match(/const dinnerDates=\[[^\]]+\]/)?.[0] || '';
  assert.doesNotMatch(dinnerDatesDecl, /'2026-07-04'/);
  assert.doesNotMatch(html, /dinnerNotes/);
});

test('dinner plans cards use clear hierarchy, fixed date tiles, and contextual actions', () => {
  assert.match(html, /\.dinner-night \{[^}]*align-items: center;/s);
  assert.match(html, /\.dinner-date \{[^}]*align-self: center;[^}]*height: 54px;[^}]*padding: 6px 4px;[^}]*font-size: 10px;/s);
  assert.match(html, /\.dinner-date strong \{[^}]*font-size: 14px;/s);
  assert.match(html, /\.dinner-main \{[^}]*justify-content: center;/s);
  assert.match(html, /\.dinner-night\.is-open \.dinner-main \{[^}]*place-items: center start;/s);
  assert.match(html, /\.dinner-owners \{[^}]*color: white;[^}]*font-size: 15px;/s);
  assert.match(html, /\.dinner-plan \{[^}]*rgba\(255,255,255,\.68\);[^}]*font-size: 12px;/s);
  assert.match(html, /\.dinner-title \{[^}]*rgba\(255,255,255,\.54\);[^}]*font-size: 11px;/s);
  assert.match(html, /\.dinner-action \{[^}]*opacity: 0;/s);
  assert.match(html, /\.dinner-night:hover \.dinner-action, \.dinner-night:focus-within \.dinner-action/);
  assert.match(html, /const isMyDinner=\(slot\.leads \|\| \[\]\)\.includes\(currentGuest\?\.name\)/);
  assert.match(html, /const actionLabel=!claimed \? 'Claim' : isMyDinner \? 'Edit' : ''/);
  assert.match(html, /const details=claimed \? `<div class="dinner-plan">\$\{escapeHtml\(planLabel\(slot\.planType \|\| 'undecided'\)\)\}<\/div><div class="dinner-title">\$\{escapeHtml\(title\)\}<\/div>` : ''/);
  assert.match(html, /const leads=claimed \? \(slot\.leads \|\| \[\]\)\.join\(' \+ '\) : 'Open'/);
  assert.match(html, /dinnerBoard\.querySelectorAll\('\.dinner-action'\)\.forEach/);
  assert.match(html, /openDinnerPickerForDate\(btn\.dataset\.date,'dinnerPlans'\)/);
});



test('back navigation keeps blur overlay visible and reopens previous windows faster', () => {
  assert.match(html, /function keepModalOverlay\(\)/);
  assert.match(html, /function reopenAfterBack\(fn\)/);
  assert.match(html, /setTimeout\(fn,80\)/);
  assert.match(html, /document\.body\.classList\.add\('modal-open'\)/);
  assert.match(html, /returnToLastScreen\(\)/);
  assert.doesNotMatch(html, /setTimeout\(\(\)=>\{ if\(!dinnerPicker\.classList\.contains\('open'\)\) dinnerPicker\.hidden=true; if\(reopenTripInfo && currentGuest\) returnToLastScreen\(\); else syncHomeVisibility\(\); \},240\)/);
});

test('modal back buttons return to the last screen instead of always the dashboard', () => {
  assert.match(html, /let returnTarget='tripInfo'/);
  assert.match(html, /function setReturnTarget\(target\)/);
  assert.match(html, /function returnToLastScreen\(\)/);
  assert.match(html, /function openDinnerPickerForDate\(date, backTarget='tripInfo'\)/);
  assert.match(html, /closeDinnerPickerModal\(true\)/);
  assert.match(html, /if\(returnTarget==='dinnerPlans'\) openDinnerPlans\(\);/);
  assert.match(html, /if\(returnTarget==='calendarView'\) openCalendarView\(\);/);
  assert.match(html, /if\(returnTarget==='dashboard'\) openDashboard\(\);/);
});

test('dinner form surfaces duplicate-assignment errors without closing the picker', () => {
  assert.match(html, /function dinnerAssignmentError\(currentName, partner\)/);
  assert.match(html, /You have already been assigned to a dinner\./);
  assert.match(html, /\$\{partner\} has already been assigned to a dinner\./);
  assert.match(html, /throw new Error\(data\.error \|\| `Could not save dinner night`\)/);
  assert.match(html, /catch\(err\)\{ console\.error\(err\); showToast\(err\.message \|\| 'Could not save dinner night'\); \}/);
});
