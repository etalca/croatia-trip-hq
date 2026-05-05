const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const publicAssets = path.join(__dirname, '..', 'public', 'assets');

test('expand icon asset is a white diagonal expand arrows icon', () => {
  const expandIcon = fs.readFileSync(path.join(publicAssets, 'Expand icon.svg'), 'utf8');
  assert.match(expandIcon, /<svg[^>]*viewBox="0 0 24 24"/);
  assert.match(expandIcon, /stroke="white"/);
  assert.match(expandIcon, /M14 10L21 3/);
  assert.match(expandIcon, /M10 14L3 21/);
  assert.notEqual(
    crypto.createHash('sha256').update(expandIcon).digest('hex'),
    '6816d2bb00c694912e9dc55f1ff0b47d2b1e1c2e8d8aa5d46d6afc61897414c4',
  );
});

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

test('not booked flight status collapses optional flight details and saves status only', () => {
  assert.match(html, /<option>Not booked yet<\/option>/);
  assert.match(html, /class="field full copy-flight-field flight-detail-field"/);
  assert.match(html, /class="field flight-detail-field"><label for="arrivalDate"/);
  assert.match(html, /class="field full flight-detail-field"><label for="flightNotes"/);
  assert.match(html, /function syncFlightDetailsVisibility\(\)/);
  assert.match(html, /const notBooked=fields\.flightStatus\.value==='Not booked yet'/);
  assert.match(html, /document\.querySelectorAll\('\.flight-detail-field'\)\.forEach\(field=>\{ field\.hidden=notBooked; field\.querySelectorAll\('input, select, textarea'\)\.forEach\(el=>el\.disabled=notBooked\); \}\)/);
  assert.match(html, /fields\.flightStatus\.addEventListener\('change',syncFlightDetailsVisibility\)/);
  assert.match(html, /syncFlightDetailsVisibility\(\); setTimeout\(\(\)=>fields\.flightStatus\.focus\(\),60\)/);
  assert.match(html, /if\(data\.flightStatus==='Not booked yet'\) \{ \['arrivalDate','arrivalAirport','arrivalTime','arrivalFlight','departureDate','departureAirport','departureTime','departureFlight','flightNotes'\]\.forEach\(key=>data\[key\]=''\); \}/);
});

test('hero video is configured for Safari-friendly autoplay on load', () => {
  assert.match(html, /<video id="waterVideo"[^>]*src="assets\/hero-water-3-browser\.mp4"[^>]*muted[^>]*playsinline[^>]*autoplay/);
  assert.match(html, /video\.defaultMuted=true; video\.muted=true; video\.playsInline=true; video\.autoplay=true;/);
  assert.match(html, /video\.setAttribute\('muted',''\)/);
  assert.match(html, /window\.addEventListener\('pageshow',nudgeVideo/);
  assert.match(html, /video\.play\(\)\.catch/);
});

test('mobile hero uses dynamic viewport and cover video sizing without safe-area height constraints', () => {
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" \/>/);
  assert.match(html, /html, body \{[^}]*min-height: 100dvh;[^}]*height: 100dvh;[^}]*overflow: hidden;/s);
  assert.doesNotMatch(html, /#stage \{[^}]*100vh/s);
  assert.match(html, /#stage \{[^}]*position: fixed;[^}]*inset: 0;[^}]*width: 100vw;[^}]*height: 100dvh;[^}]*min-height: 100dvh;[^}]*overflow: hidden;/s);
  assert.match(html, /\.poster-img, #waterVideo, #gl \{[^}]*position: absolute;[^}]*inset: 0;[^}]*width: 100%;[^}]*height: 100%;[^}]*min-width: 100%;[^}]*min-height: 100%;/s);
  assert.match(html, /\.poster-img, #waterVideo \{[^}]*object-fit: cover;[^}]*object-position: center;/s);
  assert.match(html, /#waterVideo \{[^}]*z-index: 1;[^}]*opacity: 0;/s);
  assert.match(html, /@media \(max-width: 760px\) \{\n    \.poster-img, #waterVideo \{ object-position: center; transform: none; transform-origin: center center; \}/);
  assert.doesNotMatch(html, /\.hero-content \{[^}]*padding:[^}]*env\(safe-area-inset-bottom/s);
  assert.doesNotMatch(html, /#stage \{[^}]*bottom: calc\(env\(safe-area-inset-bottom/s);
});

test('webgl hero canvas follows the actual visual viewport on iPhone URL-bar changes', () => {
  assert.match(html, /function viewportHeight\(\)\{ return Math\.ceil\(window\.visualViewport\?\.height \|\| window\.innerHeight\); \}/);
  assert.match(html, /height=Math\.ceil\(viewportHeight\(\)\*dpr\)/);
  assert.match(html, /window\.visualViewport\?\.addEventListener\('resize',resize,\{passive:true\}\)/);
  assert.match(html, /window\.visualViewport\?\.addEventListener\('scroll',resize,\{passive:true\}\)/);
  assert.match(html, /gl\.uniform1f\(loc\.mobileZoom, mobileQuery\.matches \? 1\.0 : 1\.0\)/);
  assert.match(html, /gl\.uniform1f\(loc\.mobileShift, mobileQuery\.matches \? 0\.0 : 0\.0\)/);
});

test('homepage countdown counts calendar midnights, not trip start hour', () => {
  assert.match(html, /const villaStartDate='2026-06-27'/);
  assert.match(html, /function daysUntilTrip\(now=new Date\(\)\)/);
  assert.match(html, /new Date\(now\.getFullYear\(\),now\.getMonth\(\),now\.getDate\(\)\)/);
  assert.doesNotMatch(html, /Math\.ceil\(Math\.max\(0, villaStart - new Date\(\)\) \/ 86400000\)/);
});

test('magic-link auth personalizes the homepage headline after claim', () => {
  assert.match(html, /<h1 id="heroTitle">Your week on Korčula begins here\.<\/h1>/);
  assert.match(html, /function friendlyTitle\(\)/);
  assert.match(html, /\$\{currentGuest\.name\}, your week on Korčula awaits\./);
  assert.match(html, /function tokenFromAuthRedirect\(\)/);
  assert.match(html, /new URLSearchParams\(window\.location\.search\)/);
  assert.match(html, /return hash\.get\('access_token'\) \|\| query\.get\('access_token'\) \|\| ''/);
  assert.match(html, /rememberAuthToken\(tokenFromAuthRedirect\(\) \|\| localStorage\.getItem\('korculaAuthToken'\) \|\| ''\)/);
  assert.match(html, /claimProfile\(pendingName\)/);
  assert.match(html, /friendlyTitle\(\)/);
});

test('trip info heading is a friendly greeting and todo chips show completion icons', () => {
  assert.doesNotMatch(html, />Trip dashboard<\/h2>/);
  assert.doesNotMatch(html, /Your home base for flights, dinner responsibilities, tasks, and the useful trip stuff\./);
  assert.match(html, /<h2 class="dashboard-name" id="dashboardGuestName">Hi<\/h2>/);
  assert.match(html, /`Hi, \${name}\. \${hasOutstandingTodos \? 'You have a task to complete\.' : 'You’re all caught up\.'}`/);
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


test('dashboard title changes based on outstanding todos', () => {
  assert.match(html, /const hasOutstandingTodos=!flights \|\| !myDinner \|\| localStorage\.getItem\(CALENDAR_KEY\)!=='true'/);
  assert.match(html, /dashboardGuestName\.textContent=name \? `Hi, \$\{name\}\. \$\{hasOutstandingTodos \? 'You have a task to complete\.' : 'You’re all caught up\.'\}` : 'Hi'/);
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
  assert.match(html, /return 'Add songs to trip playlist'/);
  assert.match(html, /window\.open\(PLAYLIST_URL,'_blank','noreferrer'\)/);
  assert.match(html, /localStorage\.setItem\(CALENDAR_KEY,'true'\); renderTripDashboard\(\); setPrimaryCta\(\);/);
  assert.match(html, /cacheDinnerPlan\(data\.meals \|\| dinnerPlan\(\)\); renderTripDashboard\(\); setPrimaryCta\(\);/);
});

test('FaceTime call notice spreads across desktop bottom and uses Pacific-time calendar invite', () => {
  assert.match(html, /<div class="planning-call"/);
  assert.match(html, /<span>Drop in to discuss deets\.<\/span><span>May 12 @ 6:30 p\.m\.<\/span><a href="#" id="addPlanningCall">Add to calendar<\/a>/);
  assert.match(html, /\.planning-call \{[^}]*bottom: clamp\(22px, 4vw, 52px\);[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);[^}]*opacity: \.58;/s);
  assert.match(html, /\.planning-call span:first-child \{ text-align: left; \}/);
  assert.match(html, /\.planning-call a \{[^}]*justify-self: end;/s);
  assert.match(html, /\.planning-call \{ left: 50%; right: auto; top: calc\(34% - 50px\); bottom: auto; transform: translate\(-50%, -50%\); width: min\(88vw, 340px\); grid-template-columns: 1fr;/);
  assert.match(html, /\.planning-call a \{[^}]*color: inherit;[^}]*opacity: \.72;/s);
  assert.match(html, /\.planning-call a:hover, \.planning-call a:focus-visible \{[^}]*opacity: 1;/s);
  assert.match(html, /function addPlanningCallToCalendar\(\)/);
  assert.match(html, /SUMMARY:Croatia Group FaceTime/);
  assert.match(html, /DESCRIPTION:Someone will initiate a Group FaceTime from the group message to answer questions, put forward ideas, and discuss any missed details\./);
  assert.match(html, /DTSTART;TZID=America\/Los_Angeles:20260512T183000/);
  assert.match(html, /DTEND;TZID=America\/Los_Angeles:20260512T190000/);
  assert.doesNotMatch(html, /DTSTART:20260513T013000Z/);
});

test('dinner claiming and dinner plans are separate windows, not stuffed into the main dashboard', () => {
  assert.match(html, /id="dinnerPicker"/);
  assert.match(html, /aria-labelledby="dinnerPickerTitle"/);
  assert.match(html, /id="closeDinnerPicker"/);
  assert.match(html, /id="dinnerPlans"/);
  assert.match(html, /aria-labelledby="dinnerPlansTitle"/);
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

test('dashboard embeds itinerary directly with floating header instead of a wrapper card', () => {
  const tripInfoBlock = html.slice(html.indexOf('id="tripInfo"'), html.indexOf('id="dinnerPicker"'));
  assert.doesNotMatch(tripInfoBlock, /id="openCalendarView"/);
  assert.doesNotMatch(tripInfoBlock, /<button class="info-card"/);
  assert.doesNotMatch(tripInfoBlock, /<section class="embedded-itinerary" aria-label="Trip itinerary">/);
  assert.match(tripInfoBlock, /<div class="itinerary-heading"><h3>Itinerary<\/h3><p>The calendar will fill up as people select their dinner responsibilities and activities are scheduled\.<\/p><\/div>\s*<section class="calendar-list embedded-itinerary" id="calendarItems" aria-label="Trip itinerary"><\/section>/);
  assert.match(tripInfoBlock, /id="calendarItems"/);
  assert.doesNotMatch(html, /\.embedded-itinerary \{[^}]*border:/);
  assert.doesNotMatch(html, /\.embedded-itinerary \{[^}]*background:/);
  assert.match(html, /\.itinerary-heading \{/);
  assert.match(html, /\.embedded-itinerary \{ display: grid; gap: 8px; padding-top: 5px; \}/);
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
});

test('dashboard itinerary cards use subtle expand icons to open an iCal-style day window', () => {
  assert.match(html, /const DINNER_TIME='7–8 p\.m\.'/);
  assert.match(html, /const DINNER_HOUR='7:00 p\.m\.'/);
  assert.match(html, /dinnerDates\.forEach\(date=>eventsByDate\[date\]\.push/);
  assert.match(html, /const claimedDinner=dinners\.find\(slot=>slot\.date===date\)/);
  assert.match(html, /claimedDinner \? `\$\{DINNER_TIME\} · \$\{\(claimedDinner\.leads \|\| \[\]\)\.join\(' \+ '\)\}/);
  assert.match(html, /: `\$\{DINNER_TIME\} · Dinner placeholder`/);
  assert.match(html, /id="dayView"/);
  assert.match(html, /id="dayViewTimeline"/);
  assert.match(html, /id="closeDayView"/);
  assert.match(html, /id="previousDayView"/);
  assert.match(html, /id="nextDayView"/);
  assert.match(html, /<div class="day-view-nav" aria-label="Change day"><button class="back" id="previousDayView" type="button">Previous day<\/button><button class="back" id="nextDayView" type="button">Next day<\/button><\/div>/);
  assert.match(html, /function openDayView\(date\)/);
  assert.match(html, /let activeDayViewDate=''/);
  assert.match(html, /function closeDayView\(\)/);
  assert.match(html, /function renderDayView\(date, events\)/);
  assert.match(html, /function moveDayView\(direction\)/);
  assert.match(html, /activeDayViewDate=date/);
  assert.match(html, /const allDays=tripItineraryDays\(\)/);
  assert.match(html, /previousDayViewButton\.hidden=index<=0/);
  assert.match(html, /nextDayViewButton\.hidden=index>=allDays\.length-1/);
  assert.match(html, /previousDayViewButton\.addEventListener\('click',\(\)=>moveDayView\(-1\)\)/);
  assert.match(html, /nextDayViewButton\.addEventListener\('click',\(\)=>moveDayView\(1\)\)/);
  assert.match(html, /function eventBlockStyle\(event\)/);
  assert.match(html, /top:\$\{Math\.max\(0, parseEventMinute\(event\)-480\)\*DAY_VIEW_PX_PER_MINUTE\}px/);
  assert.match(html, /height:\$\{Math\.max\(34, eventDurationMinutes\(event\)\*DAY_VIEW_PX_PER_MINUTE\)\}px/);
  assert.match(html, /<button class="calendar-expand-icon" type="button" title="View full day" aria-label="View full day for \$\{escapeHtml\(full\)\}" data-date="\$\{escapeHtml\(date\)\}"><img src="assets\/Expand icon\.svg" alt=""><\/button>/);
  assert.match(html, /const moreIndicator=needsExpand \? '<div class="calendar-more" aria-label="More events">•••<\/div>' : ''/);
  assert.match(html, /\$\{events\}\$\{moreIndicator\}/);
  assert.match(html, /\.calendar-expand-icon \{[^}]*position: absolute;[^}]*top: 8px;[^}]*right: 8px;[^}]*width: 22px;[^}]*height: 22px;[^}]*opacity: \.2;/s);
  assert.match(html, /\.calendar-more \{[^}]*font-size: 9px;[^}]*line-height: 1;[^}]*color: rgba\(255,255,255,\.54\);/s);
  assert.match(html, /\.day-view-timeline/);
  assert.match(html, /\.day-view-card \{[^}]*overflow: hidden;[^}]*min-height: 0;/s);
  assert.match(html, /\.day-view-scroll \{[^}]*overflow-y: auto;[^}]*min-height: 0;/s);
  assert.match(html, /\.day-view-nav \{[^}]*display: flex;[^}]*justify-content: flex-end;/s);
  assert.match(html, /\.day-view-event \{[^}]*position: absolute;/s);
  assert.match(html, /closeDayViewButton\.addEventListener\('click',closeDayView\)/);
  assert.match(html, /openTripInfo\(\)/);
  assert.match(html, /\.calendar-day \{[^}]*position: relative;[^}]*overflow: hidden;/s);
  assert.match(html, /\.calendar-events\.is-collapsed \.calendar-event:nth-of-type\(n\+2\)/);
  assert.doesNotMatch(html, /<button class="calendar-expand" type="button"/);
  assert.doesNotMatch(html, />View day<|>Hide day</);
  assert.match(html, /@media \(max-width: 760px\) \{[\s\S]*\.calendar-week \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/);
});

test('todo chips and summary cards route to the right detail windows', () => {
  assert.match(html, /flightStatusChip\.addEventListener\('click',\(\)=>\{ if\(savedFlights\(\)\) openDashboard\(\); else openDialog\('tripInfo'\); \}\)/);
  assert.match(html, /dinnerStatusChip\.addEventListener\('click',\(\)=>openDinnerPicker\('tripInfo'\)\)/);
  assert.match(html, /myDinnerCard\.addEventListener\('click',\(\)=>\{ if\(findMyDinner\(\)\) openDinnerPlans\(\); else openDinnerPicker\('tripInfo'\); \}\)/);
  assert.match(html, /myFlightCard\.addEventListener\('click',\(\)=>\{ if\(savedFlights\(\)\) openDashboard\(\); else openDialog\('tripInfo'\); \}\)/);
  assert.match(html, /calendarStatusChip\.addEventListener\('click',addTripToCalendar\)/);
  assert.doesNotMatch(html, /openDinnerPlansButton\.addEventListener\('click',openDinnerPlans\)/);
  assert.doesNotMatch(html, /openCalendarViewButton\.addEventListener\('click',openCalendarView\)/);
});

test('dinner summary card opens plans after claimed dinner and picker before claiming', () => {
  assert.match(html, /<button class="personal-card" id="myDinnerCard" type="button"/);
  assert.match(html, /myDinnerCard\.addEventListener\('click',\(\)=>\{ if\(findMyDinner\(\)\) openDinnerPlans\(\); else openDinnerPicker\('tripInfo'\); \}\)/);
  assert.match(html, /myDinnerCard=document\.getElementById\('myDinnerCard'\)/);
});

test('claimed dinner card puts the prompt above, date as title, and co-lead below', () => {
  assert.match(html, /id="myDinnerKicker"/);
  assert.match(html, /myDinnerKicker\.textContent='You’re responsible for dinner on'/);
  assert.match(html, /myDinnerTitle\.textContent=longDinnerDate\(myDinner\.date\)/);
  assert.match(html, /myDinnerMeta\.textContent=`with \$\{partner\}`/);
  assert.doesNotMatch(html, /myDinnerMeta\.textContent=dinnerIdeaSummary\(myDinner, partner\)/);
});

test('main dashboard is a hub with only dinner, flight, and embedded itinerary cards', () => {
  const tripInfoBlock = html.slice(html.indexOf('id="tripInfo"'), html.indexOf('id="dinnerPicker"'));
  assert.match(tripInfoBlock, /id="myDinnerMeta"/);
  assert.match(tripInfoBlock, /id="myFlightCard"/);
  assert.match(html, /You’re responsible for dinner on/);
  assert.match(html, /Your flight arrives in/);
  assert.match(html, /function flightCompanionSummary\(current, board\)/);
  assert.match(html, /function normalizedFlightNumber\(value\)/);
  assert.match(html, /normalizedFlightNumber\(item\.arrivalFlight\)===flightNumber/);
  assert.match(html, /myFlightTitle\.textContent=countdownFor\(flights,'arrivals'\)/);
  assert.doesNotMatch(tripInfoBlock, /id="openFlights"/);
  assert.doesNotMatch(tripInfoBlock, /id="openDinnerPlans"/);
  assert.doesNotMatch(tripInfoBlock, /id="openCalendarView"/);
  assert.doesNotMatch(tripInfoBlock, /<button class="info-card"/);
  assert.doesNotMatch(tripInfoBlock, /<span>Villa<\/span>/);
});

test('flight board edit button stays visible beside the info icon without changing row content', () => {
  assert.match(html, /\.arrival-row \{[^}]*position: relative;[^}]*grid-template-columns: minmax\(86px, 1fr\) minmax\(190px, 1\.45fr\) minmax\(86px, \.8fr\) minmax\(104px, \.72fr\);/s);
  assert.match(html, /\.arrival-actions \{[^}]*position: absolute;[^}]*top: 8px;[^}]*right: 8px;[^}]*display: inline-flex;/s);
  assert.match(html, /\.arrival-edit \{[^}]*height: 25\.5px;[^}]*opacity: 1;[^}]*pointer-events: auto;/s);
  assert.match(html, /<div class="arrival-actions">\$\{editButton\}<button class="notes-toggle"/);
});

test('flight board shows edit button only on the logged-in user row', () => {
  assert.match(html, /\.arrival-edit/);
  assert.match(html, /const canEdit=person===currentGuest\?\.name/);
  assert.match(html, /canEdit \? `<button class="arrival-edit"/);
  assert.match(html, /arrivalsBoard\.querySelectorAll\('\.arrival-edit'\)\.forEach/);
  assert.match(html, /openDialog\('dashboard'\)/);
});

test('dinner claiming excludes checkout day and keeps dinner plan choices simple', () => {
  assert.match(html, /id="dinnerForm"/);
  assert.match(html, /id="dinnerDate"/);
  assert.match(html, /id="dinnerPartner"/);
  assert.match(html, /id="dinnerPlanType"/);
  assert.match(html, /<option value="other">Other<\/option>/);
  assert.match(html, /function planLabel\(value\)\{[^}]*value==='other' \? 'Other'/);
  assert.match(html, /<button class="secondary-action" type="button" id="clearDinnerForm">Clear<\/button><button type="submit">Save<\/button>/);
  assert.match(html, /let dinnerClearRequested=false/);
  assert.match(html, /function clearDinnerFormSelections\(\)\{ dinnerClearRequested=true; dinnerForm\.dataset\.clearRequested='true'; \[dinnerDate,dinnerPartner,dinnerPlanType,dinnerTitle\]\.forEach\(el=>el\.value=''\); dinnerDate\.focus\(\); \}/);
  assert.match(html, /clearDinnerFormButton\.addEventListener\('click',clearDinnerFormSelections\)/);
  assert.match(html, /clearDinnerFormButton=document\.getElementById\('clearDinnerForm'\)/);
  assert.doesNotMatch(html, /Save dinner night/);
  assert.doesNotMatch(html, /id="dinnerNotes"/);
  assert.doesNotMatch(html, /id="dinnerOther"/);
  const dinnerDatesDecl = html.match(/const dinnerDates=\[[^\]]+\]/)?.[0] || '';
  assert.doesNotMatch(dinnerDatesDecl, /'2026-07-04'/);
  assert.doesNotMatch(html, /dinnerNotes/);
  assert.doesNotMatch(html, /dinnerOther/);
});

test('dinner plans cards use clear hierarchy, fixed date tiles, and contextual actions', () => {
  assert.match(html, /\.dinner-night \{[^}]*align-items: center;/s);
  assert.match(html, /\.dinner-date \{[^}]*align-self: center;[^}]*height: 54px;[^}]*padding: 6px 4px;[^}]*font-size: 10px;/s);
  assert.match(html, /\.dinner-date strong \{[^}]*font-size: 14px;/s);
  assert.match(html, /\.dinner-main \{[^}]*align-items: start;[^}]*text-align: left;/s);
  assert.match(html, /\.dinner-night\.is-open \.dinner-main \{[^}]*place-items: center start;[^}]*text-align: left;/s);
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


test('mobile polish keeps touch actions visible and flight cards readable', () => {
  assert.match(html, /@media \(max-width: 760px\) \{[\s\S]*\.dinner-action \{ opacity: 1; pointer-events: auto; \}/);
  assert.match(html, /\.arrival-actions \{[^}]*position: absolute;[^}]*top: 8px;[^}]*right: 8px;[^}]*display: inline-flex;/s);
  assert.match(html, /\.arrival-edit \{[^}]*height: 25\.5px;[^}]*opacity: 1;[^}]*pointer-events: auto;/s);
  assert.match(html, /\.notes-toggle \{ width: 25\.5px; height: 25\.5px;/);
  assert.match(html, /@media \(max-width: 760px\) \{[\s\S]*\.arrival-actions \{ top: 12px; right: 12px; \}[\s\S]*\.arrival-edit, \.notes-toggle \{ height: 44px; \}/);
  assert.match(html, /<div class="arrival-meta"><span class="arrival-time">\$\{escapeHtml\(dateTime\)\}<\/span><span class="arrival-airport">\$\{escapeHtml\(airport\)\}<\/span><\/div>/);
  assert.match(html, /const countdownLabel=has \? `\$\{isDepart\?'Departs':'Arrives'\} in \$\{countdownFor\(d,boardMode\)\}` : 'Awaiting flights'/);
  assert.match(html, /<div class="arrival-countdown">\$\{escapeHtml\(countdownLabel\)\}<\/div>/);
});

test('mobile dashboard keeps todo chips sticky while trip cards and itinerary scroll', () => {
  assert.match(html, /dashboardGuestName\.textContent=name \? `Hi, \$\{name\}\. \$\{hasOutstandingTodos \? 'You have a task to complete\.' : 'You’re all caught up\.'\}` : 'Hi'/);
  const tripInfoBlock = html.slice(html.indexOf('id="tripInfo"'), html.indexOf('id="dinnerPicker"'));
  assert.match(tripInfoBlock, /<header><div><h2 class="dashboard-name" id="dashboardGuestName">Hi<\/h2><div class="dashboard-status"/);
  assert.match(tripInfoBlock, /<div class="trip-info-scroll">\s*<div class="dashboard-hero">/);
  assert.match(tripInfoBlock, /<section class="calendar-list embedded-itinerary" id="calendarItems" aria-label="Trip itinerary"><\/section>\s*<\/div>/);
  assert.match(html, /#tripInfo \.dashboard-card header \{ flex: 0 0 auto; \}/);
  assert.match(html, /#tripInfo \.trip-info-scroll \{ overflow-y: auto; min-height: 0; display: grid; gap: 10px; scrollbar-width: none; \}/);
});

test('day view titles omit year and hide edge navigation instead of disabling it', () => {
  assert.match(html, /const full=d\.toLocaleDateString\(undefined,\{weekday:'long', month:'long', day:'numeric'\}\)/);
  assert.doesNotMatch(html, /dayViewTitle\.textContent=full;[\s\S]{0,120}year:'numeric'/);
  assert.match(html, /previousDayViewButton\.hidden=index<=0/);
  assert.match(html, /nextDayViewButton\.hidden=index>=allDays\.length-1/);
  assert.doesNotMatch(html, /previousDayViewButton\.disabled=index<=0/);
  assert.doesNotMatch(html, /nextDayViewButton\.disabled=index>=allDays\.length-1/);
});

test('magic-link sign-up gate is compact and centered on mobile', () => {
  assert.match(html, /gate\.classList\.toggle\('auth-mode', !currentGuest\)/);
  assert.match(html, /@media \(max-width: 760px\) \{[\s\S]*\.gate\.auth-mode \{ place-items: center; \}[\s\S]*\.gate\.auth-mode \.panel \{ width: min\(100%, 380px\); max-height: none; min-height: 0; align-self: center; \}/);
});



test('back navigation keeps blur overlay visible and reopens previous windows faster', () => {
  assert.match(html, /<div class="modal-blur" id="modalBlur" aria-hidden="true"><\/div>/);
  assert.match(html, /\.modal-blur \{[^}]*position: fixed;[^}]*background: rgba\(4,17,23,0\);[^}]*backdrop-filter: none;/s);
  assert.match(html, /body\.modal-open \.modal-blur \{[^}]*background: rgba\(4,17,23,\.18\);[^}]*backdrop-filter: blur\(10px\);/s);
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
  assert.match(html, /function dinnerAssignmentError\(currentName, partner, date\)/);
  assert.doesNotMatch(html, /You have already been assigned to a dinner\./);
  assert.match(html, /const currentSlot=slots\.find\(slot=>\(slot\.leads \|\| \[\]\)\.includes\(currentName\)\)/);
  assert.match(html, /const partnerSlot=slots\.find\(slot=>\(slot\.leads \|\| \[\]\)\.includes\(partner\)\)/);
  assert.match(html, /if\(partnerSlot && !\(currentSlot && partnerSlot\.date===currentSlot\.date\)\) return `\$\{partner\} has already been assigned to a dinner\.`/);
  assert.match(html, /throw new Error\(data\.error \|\| `Could not save dinner night`\)/);
  assert.match(html, /catch\(err\)\{ console\.error\(err\); showToast\(err\.message \|\| 'Could not save dinner night'\); \}/);
});

test('clear then save clears dinner responsibility and makes dinner todo incomplete again', () => {
  assert.match(html, /if\(dinnerClearRequested\) return true/);
  assert.match(html, /const payload=dinnerClearRequested \? \{ clear:true, token:guestToken \} : \{ date:dinnerDate\.value, partner:dinnerPartner\.value, planType:dinnerPlanType\.value, title:dinnerTitle\.value\.trim\(\), token:guestToken \}/);
  assert.match(html, /dinnerClearRequested=false; delete dinnerForm\.dataset\.clearRequested/);
  assert.match(html, /cacheDinnerPlan\(data\.meals \|\| dinnerPlan\(\)\); renderTripDashboard\(\); setPrimaryCta\(\);/);
  assert.match(html, /const hasOutstandingTodos=!flights \|\| !myDinner \|\| localStorage\.getItem\(CALENDAR_KEY\)!=='true'/);
});
