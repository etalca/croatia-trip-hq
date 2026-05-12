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
  assert.match(html, /<video id="waterVideo" class="hero-video desktop-hero-video"[^>]*src="assets\/hero-water-3-browser\.mp4"[^>]*muted[^>]*playsinline[^>]*webkit-playsinline[^>]*autoplay[^>]*>/);
  assert.match(html, /<video id="waterVideoMobile" class="hero-video mobile-hero-video"[^>]*src="assets\/right-autoplay\.mp4"[^>]*poster="assets\/right-autoplay-poster\.jpg"[^>]*muted[^>]*playsinline[^>]*webkit-playsinline[^>]*autoplay[^>]*>/);
  assert.match(html, /@media \(max-width: 760px\)[\s\S]*#waterVideo \{ display: none; \}[\s\S]*#waterVideoMobile \{[^}]*display: block;[^}]*\}/);
  assert.doesNotMatch(html, /<source media="\(max-width: 760px\)"/);
  const mobileHero = fs.readFileSync('public/assets/right-autoplay.mp4');
  assert.ok(fs.existsSync('public/assets/right-autoplay-poster.jpg'));
  assert.ok(mobileHero.indexOf(Buffer.from('moov')) < mobileHero.indexOf(Buffer.from('mdat')), 'mobile MP4 must be faststart for iOS autoplay');
  assert.match(html, /const mobileQuery=window\.matchMedia\('\(max-width: 760px\)'\);\s*const desktopVideo = document\.getElementById\('waterVideo'\);\s*const mobileVideo = document\.getElementById\('waterVideoMobile'\);\s*const video = mobileQuery\.matches \? mobileVideo : desktopVideo;/);
  assert.match(html, /\[desktopVideo,mobileVideo\]\.forEach\(prepareAutoplayVideo\)/);
  assert.match(html, /function prepareAutoplayVideo\(el\)\{ el\.defaultMuted=true; el\.muted=true; el\.playsInline=true; el\.autoplay=true; el\.setAttribute\('muted',''\); el\.setAttribute\('playsinline',''\); el\.setAttribute\('webkit-playsinline',''\); el\.setAttribute\('autoplay',''\); \}/);
  assert.match(html, /window\.addEventListener\('pageshow',nudgeVideo/);
  assert.match(html, /video\.play\(\)\.then\(markVideoReady\)\.catch/);
  assert.match(html, /function markVideoReady\(\)\{ if\(video\.readyState>=2\)\{ ready=true; video\.classList\.add\('video-ready'\); \} \}/);
  assert.doesNotMatch(html, /video\.src = sourceUrl/);
  assert.doesNotMatch(html, /video\.load\(\)/);
  assert.doesNotMatch(html, /video\.dataset\.src = sourceUrl/);
  assert.match(html, /video\.addEventListener\('loadeddata',\(\)=>\{ markVideoReady\(\); nudgeVideo\(\); \}\);/);
  assert.match(html, /video\.addEventListener\('playing',markVideoReady\);/);
  assert.match(html, /video\.addEventListener\('timeupdate',markVideoReady,\{once:true\}\);/);
  assert.match(html, /document\.addEventListener\('visibilitychange',\(\)=>\{ if\(!document\.hidden\) nudgeVideo\(\); \}\);/);
  assert.match(html, /\.hero-video\.video-ready \{ opacity: 1 !important; \}/);
});

test('safe-area insets are applied only to overlays and modal shells', () => {
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" \/>/);
  assert.doesNotMatch(html, /<meta name="theme-color" media="\(max-width: 760px\)" content="#a8bbc4" \/>/);
  assert.match(html, /<meta name="apple-mobile-web-app-capable" content="yes" \/>/);
  assert.match(html, /<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" \/>/);
  assert.match(html, /\.countdown \{[^}]*top: calc\(clamp\(22px, 4vw, 48px\) \+ env\(safe-area-inset-top\)\);[^}]*left: calc\(clamp\(22px, 4vw, 52px\) \+ env\(safe-area-inset-left\)\);/s);
  assert.match(html, /\.address \{[^}]*top: calc\(clamp\(22px, 4vw, 48px\) \+ env\(safe-area-inset-top\)\);[^}]*right: calc\(clamp\(22px, 4vw, 52px\) \+ env\(safe-area-inset-right\)\);/s);
  assert.match(html, /\.hero-content \{[^}]*padding: calc\(32px \+ env\(safe-area-inset-top\)\) calc\(32px \+ env\(safe-area-inset-right\)\) calc\(32px \+ env\(safe-area-inset-bottom\)\) calc\(32px \+ env\(safe-area-inset-left\)\);/s);
  assert.match(html, /\.gate \{[^}]*padding: calc\(22px \+ env\(safe-area-inset-top\)\) calc\(22px \+ env\(safe-area-inset-right\)\) calc\(22px \+ env\(safe-area-inset-bottom\)\) calc\(22px \+ env\(safe-area-inset-left\)\);/s);
  assert.match(html, /\.dashboard \{[^}]*padding: calc\(22px \+ env\(safe-area-inset-top\)\) calc\(22px \+ env\(safe-area-inset-right\)\) calc\(22px \+ env\(safe-area-inset-bottom\)\) calc\(22px \+ env\(safe-area-inset-left\)\);/s);
  assert.match(html, /@media \(max-width: 760px\) \{[\s\S]*?\.hero-content \{ padding: calc\(22px \+ env\(safe-area-inset-top\)\) calc\(22px \+ env\(safe-area-inset-right\)\) calc\(22px \+ env\(safe-area-inset-bottom\)\) calc\(22px \+ env\(safe-area-inset-left\)\); \}/);
});

test('mobile hero bleeds video under the iOS Home Screen bottom safe area', () => {
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" \/>/);
  assert.match(html, /html, body \{ margin: 0; width: 100%; min-height: 100%; overflow: hidden; background: #04151d;/);
  assert.doesNotMatch(html, /--hero-vh/);
  assert.doesNotMatch(html, /\b100dvh\b/);
  assert.doesNotMatch(html, /\b100lvh\b/);
  assert.match(html, /#stage \{ position: fixed; inset: 0; overflow: hidden; background: #04151d; \}/);
  assert.doesNotMatch(html, /@supports \(height: 100lvh\)/);
  assert.match(html, /\.poster-img, \.hero-video, #gl \{ position: absolute; inset: 0; width: 100%; height: 100%; display: block; \}/);
  assert.doesNotMatch(html, /min-width: 100%; min-height: 100%;/);
  assert.match(html, /\.poster-img, \.hero-video \{[^}]*object-fit: cover;[^}]*object-position: center;/s);
  assert.match(html, /\.hero-video \{[^}]*z-index: 1;[^}]*opacity: 1;/s);
  assert.doesNotMatch(html, /\.hero-video \{[^}]*opacity: 0;/s);
  assert.match(html, /\.hero-video\.video-ready \{ opacity: 1 !important; \}/);
  assert.match(html, /#gl\.webgl-ready \{ opacity: 1 !important; \}/);
  assert.doesNotMatch(html, /#gl \{[^}]*transition:/s);
  assert.match(html, /@media \(max-width: 760px\) \{\n    #waterVideo \{ display: none; \}\n    #waterVideoMobile \{ display: block; position: fixed; top: 0; right: 0; bottom: calc\(-1 \* env\(safe-area-inset-bottom\)\); left: 0; height: calc\(100% \+ env\(safe-area-inset-bottom\)\); object-fit: cover; object-position: center; transform: none; transform-origin: center center; z-index: 3; \}\n    #gl \{ display: none; \}/);
  assert.match(html, /function applyMediaSource\(\)\{ const posterSrc=mobileQuery\.matches \? 'assets\/right-autoplay-poster\.jpg' : desktopPosterSrc; if\(posterImg\.getAttribute\('src'\)!==posterSrc\) posterImg\.src=posterSrc; poster\.src=posterSrc; \}/);
  assert.doesNotMatch(html, /#stage \{[^}]*env\(safe-area-inset/s);
  assert.doesNotMatch(html, /#waterVideo \{[^}]*env\(safe-area-inset-top|#waterVideo \{[^}]*env\(safe-area-inset-left|#waterVideo \{[^}]*env\(safe-area-inset-right/s);
  assert.doesNotMatch(html, /#gl \{[^}]*env\(safe-area-inset/s);
});

test('webgl hero canvas follows the full fixed hero box on iPhone URL-bar changes', () => {
  assert.doesNotMatch(html, /function setHeroViewport\(/);
  assert.doesNotMatch(html, /setProperty\('--hero-vh'/);
  assert.match(html, /function heroViewportHeight\(\)\{ const stageRect=document\.getElementById\('stage'\)\?\.getBoundingClientRect\(\); return Math\.ceil\(stageRect\?\.height \|\| window\.visualViewport\?\.height \|\| window\.innerHeight\); \}/);
  assert.match(html, /function resize\(\)\{ dpr=Math\.min\(2,window\.devicePixelRatio\|\|1\); width=Math\.ceil\(heroViewportWidth\(\)\*dpr\); height=Math\.ceil\(heroViewportHeight\(\)\*dpr\); canvas\.width=width; canvas\.height=height; gl\.viewport\(0,0,width,height\); \}/);
  assert.match(html, /height=Math\.ceil\(heroViewportHeight\(\)\*dpr\)/);
  assert.match(html, /window\.visualViewport\?\.addEventListener\('resize',resize,\{passive:true\}\)/);
  assert.match(html, /window\.visualViewport\?\.addEventListener\('scroll',resize,\{passive:true\}\)/);
  assert.match(html, /gl\.uniform1f\(loc\.mobileZoom, 1\.0\)/);
  assert.match(html, /gl\.uniform1f\(loc\.mobileShift, 0\.0\)/);
  assert.match(html, /function heroLayoutSnapshot\(\)\{/);
  assert.match(html, /if\(new URLSearchParams\(location\.search\)\.has\('heroDebug'\)\) setInterval\(\(\)=>console\.table\(heroLayoutSnapshot\(\)\.chainFromVideoUp\),1000\)/);
  assert.match(html, /mobileQuery\.addEventListener\?\.\('change',\(\)=>\{ applyMediaSource\(\); attachVideoSource\(\); \}\)/);
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
  assert.match(html, /const AUTH_TOKEN_KEY='korculaAuthToken'/);
  assert.match(html, /const AUTH_REFRESH_TOKEN_KEY='korculaAuthRefreshToken'/);
  assert.match(html, /function authSessionFromRedirect\(\)/);
  assert.match(html, /refresh_token/);
  assert.match(html, /function rememberAuthSession\(session\)/);
  assert.match(html, /localStorage\.setItem\(AUTH_REFRESH_TOKEN_KEY, session\.refreshToken\)/);
  assert.match(html, /async function refreshStoredAuthSession\(\)/);
  assert.match(html, /fetch\('\/api\/auth\/refresh', \{ method:'POST'/);
  assert.match(html, /await refreshStoredAuthSession\(\)/);
  assert.doesNotMatch(html, /rememberAuthToken\(tokenFromAuthRedirect\(\) \|\| localStorage\.getItem\('korculaAuthToken'\) \|\| ''\)/);
  assert.match(html, /claimProfile\(pendingName\)/);
  assert.match(html, /friendlyTitle\(\)/);
});

test('claimed homepage primary CTA says Trip dashboard without visit copy', () => {
  assert.match(html, /openGate\.textContent = currentGuest \? 'Trip dashboard' : 'Let’s go'/);
  assert.doesNotMatch(html, /View trip dashboard/);
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
  assert.match(html, /if\(next==='Claim a dinner'\) return openDinnerPlans\(\)/);
  assert.doesNotMatch(html, /if\(next==='Claim a dinner'\) return openDinnerPicker\('tripInfo'\)/);
  assert.match(html, /window\.open\(PLAYLIST_URL,'_blank','noreferrer'\)/);
  assert.match(html, /localStorage\.setItem\(CALENDAR_KEY,'true'\); renderTripDashboard\(\); setPrimaryCta\(\);/);
  assert.match(html, /cacheDinnerPlan\(data\.meals \|\| dinnerPlan\(\)\); populateDinnerSelectors\(\); renderTripDashboard\(\); setPrimaryCta\(\);/);
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

test('dinner idea input is capped at the longest existing submitted idea', () => {
  assert.match(html, /<label for="dinnerTitle">Dinner idea<\/label><input id="dinnerTitle" maxlength="120" placeholder="Seafood night, konoba reservation…">/);
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
  assert.match(tripInfoBlock, /<div class="itinerary-heading"><h3>Itinerary<\/h3><p>Proposed group activities appear here as blocks\. Add your own as invite-only plans or open invites people can join\.<\/p><button class="secondary-action" id="openEventPlanner" type="button">Add event<\/button><\/div>\s*<section class="calendar-list embedded-itinerary" id="calendarItems" aria-label="Trip itinerary"><\/section>/);
  assert.doesNotMatch(tripInfoBlock, />Add calendar event<\/button>/);
  assert.match(tripInfoBlock, /id="calendarItems"/);
  assert.doesNotMatch(html, /\.embedded-itinerary \{[^}]*border:/);
  assert.doesNotMatch(html, /\.embedded-itinerary \{[^}]*background:/);
  assert.match(html, /\.itinerary-heading \{ display: grid; gap: 0; margin: 0 2px 0; \}/);
  assert.match(html, /\.itinerary-heading h3 \{[^}]*line-height: 1\.04;[^}]*font-weight: 400;/s);
  assert.match(html, /\.itinerary-heading p \{[^}]*font-size: 12px;[^}]*line-height: 1\.35;/s);
  assert.match(html, /\.itinerary-heading \.secondary-action \{[^}]*margin-top: 2px;[^}]*height: 25\.5px;[^}]*min-height: 0;[^}]*box-sizing: border-box;[^}]*display: inline-grid;[^}]*place-items: center;[^}]*font-size: 13px;[^}]*line-height: 1;/s);
  assert.match(html, /\.embedded-itinerary \{ display: grid; gap: 8px; padding-top: 0; \}/);
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
  assert.match(html, /const DINNER_TIME='7–9 p\.m\.'/);
  assert.match(html, /const DINNER_HOUR='7:00 p\.m\.'/);
  assert.match(html, /dinners\.forEach\(slot=>eventsByDate\[slot\.date\]\?\.push/);
  assert.doesNotMatch(html, /const claimedDinner=dinners\.find\(slot=>slot\.date===date\)/);
  assert.match(html, /`\$\{DINNER_TIME\} · \$\{\(slot\.leads \|\| \[\]\)\.join\(' \+ '\)\}/);
  assert.doesNotMatch(html, /Dinner placeholder/);
  assert.match(html, /id="dayView"/);
  assert.match(html, /id="dayViewTimeline"/);
  assert.match(html, /id="closeDayView"/);
  assert.match(html, /id="previousDayView"/);
  assert.match(html, /id="nextDayView"/);
  assert.match(html, /<button class="day-view-add-event" id="dayViewAddEvent" type="button">Add event<\/button>/);
  assert.match(html, /<div class="day-view-nav" id="dayViewNav" aria-label="Change day"><button class="back day-view-nav-button" id="previousDayView" type="button" aria-label="Previous day"><span class="day-view-chevron" aria-hidden="true">‹<\/span><\/button><button class="back day-view-nav-button" id="nextDayView" type="button" aria-label="Next day"><span class="day-view-chevron" aria-hidden="true">›<\/span><\/button><\/div>/);
  assert.doesNotMatch(html, />Previous day<\/button>/);
  assert.doesNotMatch(html, />Next day<\/button>/);
  assert.match(html, /dayViewAddEventButton=document\.getElementById\('dayViewAddEvent'\)/);
  assert.match(html, /dayViewAddEventButton\.addEventListener\('click',\(\)=>openEventPlanner\(activeDayViewDate,'','dayView'\)\)/);
  assert.match(html, /function returnToLastScreen\(\)\{ if\(returnTarget==='dayView'\) openDayView\(activeDayViewDate\);/);
  assert.match(html, /\.day-view-add-event \{[^}]*position: absolute;[^}]*left: 20px;[^}]*bottom: 16px;[^}]*height: 44px;[^}]*min-height: 44px;[^}]*box-sizing: border-box;[^}]*display: inline-grid;[^}]*place-items: center;[^}]*font-size: 14px;[^}]*line-height: 1;/s);
  assert.match(html, /\.day-view-nav-button \{[^}]*width: 44px;[^}]*height: 44px;[^}]*min-height: 44px;[^}]*padding: 0;[^}]*font-size: 24px;[^}]*display: inline-grid;[^}]*place-items: center;/s);
  assert.match(html, /\.day-view-chevron \{[^}]*display: block;[^}]*line-height: 1;[^}]*transform: translateY\(-\.06em\);/s);
  assert.match(html, /\.day-event-detail:not\(\[hidden\]\) ~ \.day-view-add-event \{ display: none; \}/);
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
  assert.match(html, /top:\$\{Math\.max\(0, parseEventMinute\(event\)-DAY_VIEW_START_MINUTE\)\*DAY_VIEW_PX_PER_MINUTE\}px/);
  assert.match(html, /height:\$\{Math\.max\(34, eventDurationMinutes\(event\)\*DAY_VIEW_PX_PER_MINUTE\)\}px/);
  assert.match(html, /<button class="calendar-expand-icon" type="button" title="View full day" aria-label="View full day for \$\{escapeHtml\(full\)\}" data-date="\$\{escapeHtml\(date\)\}"><img src="assets\/Expand icon\.svg" alt=""><\/button>/);
  assert.match(html, /const moreIndicator=needsExpand \? '<div class="calendar-more" aria-label="More events">•••<\/div>' : ''/);
  assert.match(html, /\$\{events\}\$\{moreIndicator\}/);
  assert.match(html, /\.calendar-expand-icon \{[^}]*position: absolute;[^}]*top: 8px;[^}]*right: 8px;[^}]*width: 22px;[^}]*height: 22px;[^}]*opacity: \.2;/s);
  assert.match(html, /note:slot\.title \|\| ''/);
  assert.match(html, /\$\{event\.note \? `<small>\$\{escapeHtml\(event\.note\)\}<\/small>` : ''\}/);
  assert.match(html, /\$\{event\.description \? `<small>\$\{linkifyText\(event\.description\)\}<\/small>` : ''\}/);
  assert.doesNotMatch(html, /No plans yet/);
  assert.doesNotMatch(html, /This day is open\./);
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
  assert.match(html, /dinnerStatusChip\.addEventListener\('click',openDinnerPlans\)/);
  assert.match(html, /myDinnerCard\.addEventListener\('click',openDinnerPlans\)/);
  assert.match(html, /myFlightCard\.addEventListener\('click',\(\)=>\{ if\(savedFlights\(\)\) openDashboard\(\); else openDialog\('tripInfo'\); \}\)/);
  assert.match(html, /calendarStatusChip\.addEventListener\('click',addTripToCalendar\)/);
  assert.doesNotMatch(html, /dinnerStatusChip\.addEventListener\('click',\(\)=>openDinnerPicker\('tripInfo'\)\)/);
  assert.doesNotMatch(html, /myDinnerCard\.addEventListener\('click',\(\)=>\{ if\(findMyDinner\(\)\) openDinnerPlans\(\); else openDinnerPicker\('tripInfo'\); \}\)/);
  assert.doesNotMatch(html, /openDinnerPlansButton\.addEventListener\('click',openDinnerPlans\)/);
  assert.doesNotMatch(html, /openCalendarViewButton\.addEventListener\('click',openCalendarView\)/);
});

test('dinner summary card always opens plans so guests can see claimed nights before claiming', () => {
  assert.match(html, /<button class="personal-card" id="myDinnerCard" type="button"/);
  assert.match(html, /<img class="dashboard-card-expand" src="assets\/Expand icon\.svg" alt="" aria-hidden="true">\s*<p class="dashboard-kicker" id="myDinnerKicker">Your dinner night<\/p>/);
  assert.match(html, /myDinnerCard\.addEventListener\('click',openDinnerPlans\)/);
  assert.match(html, /dinnerStatusChip\.addEventListener\('click',openDinnerPlans\)/);
  assert.match(html, /myDinnerCard=document\.getElementById\('myDinnerCard'\)/);
});

test('dinner selector excludes nights already claimed by other guests', () => {
  assert.match(html, /function dinnerDateIsSelectable\(date\)/);
  assert.match(html, /const slot=dinnerPlan\(\)\.slots\.find\(slot=>slot\.date===date\)/);
  assert.match(html, /return !slot \|\| !\(slot\.leads \|\| \[\]\)\.length \|\| \(slot\.leads \|\| \[\]\)\.includes\(currentGuest\?\.name\)/);
  assert.match(html, /dinnerDates\.filter\(dinnerDateIsSelectable\)\.forEach\(date=>/);
  assert.match(html, /cacheDinnerPlan\(data\.meals \|\| dinnerPlan\(\)\); populateDinnerSelectors\(\); renderTripDashboard\(\); setPrimaryCta\(\);/);
});

test('trip dashboard clickable cards show expand affordances and scroll below sticky todos', () => {
  const tripInfoBlock = html.slice(html.indexOf('id="tripInfo"'), html.indexOf('id="dinnerPicker"'));
  assert.match(tripInfoBlock, /<header><div><h2 class="dashboard-name" id="dashboardGuestName">Hi<\/h2><div class="dashboard-status"/);
  assert.match(tripInfoBlock, /<div class="trip-info-scroll">[\s\S]*?<div class="dashboard-hero">/);
  assert.match(tripInfoBlock, /id="myDinnerCard"[\s\S]*?<img class="dashboard-card-expand" src="assets\/Expand icon\.svg" alt="" aria-hidden="true">/);
  assert.match(tripInfoBlock, /id="myFlightCard"[\s\S]*?<img class="dashboard-card-expand" src="assets\/Expand icon\.svg" alt="" aria-hidden="true">/);
  assert.match(tripInfoBlock, /<section class="calendar-list embedded-itinerary" id="calendarItems" aria-label="Trip itinerary"><\/section>[\s\S]*?<\/section>/);
  assert.match(html, /#tripInfo \.dashboard-card header \{ flex: 0 0 auto; \}/);
  assert.match(html, /#tripInfo \.dashboard-card \{ height: min\(88svh, 760px\); \}/);
  assert.doesNotMatch(html, /#tripInfo \.dashboard-card \{[^}]*padding-bottom: 64px;/s);
  assert.match(html, /#tripInfo \.trip-info-scroll \{ flex: 1 1 auto; overflow: hidden; min-height: 0; display: flex; flex-direction: column; gap: 10px; scrollbar-width: none; -ms-overflow-style: none; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; \}/);
  assert.match(html, /#tripInfo \.calendar-list \{ overflow: visible; min-height: auto; \}/);
  assert.match(html, /#tripInfo \.trip-info-scroll::-webkit-scrollbar \{ width: 0; height: 0; display: none; \}/);
  assert.match(html, /\.personal-card \{[^}]*position: relative;[^}]*padding: 14px 42px 14px 14px;/s);
  assert.match(html, /\.calendar-expand-icon \{[^}]*width: 22px;[^}]*height: 22px;[^}]*padding: 3px;[^}]*opacity: \.2;/s);
  assert.match(html, /\.dashboard-card-expand \{[^}]*position: absolute;[^}]*top: 10px;[^}]*right: 10px;[^}]*width: 22px;[^}]*height: 22px;[^}]*padding: 3px;[^}]*box-sizing: border-box;[^}]*opacity: \.2;/s);
});

test('dashboard overview people toggle floats over content instead of reserving a blank bottom bar', () => {
  assert.match(html, /\.trip-tabs \{[^}]*position: absolute;[^}]*bottom: 20px;[^}]*left: 50%;[^}]*transform: translateX\(-50%\);[^}]*z-index: 6;[^}]*backdrop-filter: blur\(16px\);/s);
  assert.match(html, /\.trip-tab-viewport \{[^}]*flex: 1 1 auto;[^}]*overflow: hidden;[^}]*min-height: 0;/s);
  assert.doesNotMatch(html, /#tripInfo \.dashboard-card \{[^}]*padding-bottom: 64px;/s);
  assert.doesNotMatch(html, /\.trip-tabs \{[^}]*position: static/s);
});

test('mobile overlays are centered in the viewport instead of stretched and clipped at the bottom', () => {
  assert.match(html, /@media \(max-width: 760px\) \{[\s\S]*\.gate, \.dashboard \{ place-items: center; \}/);
  assert.doesNotMatch(html, /@media \(max-width: 760px\) \{[\s\S]*\.gate, \.dashboard \{ place-items: stretch; \}/);
  assert.match(html, /@media \(max-width: 760px\) \{[\s\S]*\.panel, \.dashboard-card \{[^}]*width: min\(100%, calc\(100svw - 20px\)\);[^}]*max-height: calc\(100svh - 44px\);/s);
  assert.match(html, /@media \(max-width: 760px\) \{[\s\S]*\.dashboard-card \{ min-height: 0; \}/);
  assert.match(html, /@media \(max-width: 760px\) \{[\s\S]*#tripInfo \.dashboard-card \{ height: min\(680px, calc\(100svh - 44px\)\);[^}]*align-self: center; \}/s);
});

test('dashboard add event uses the same filled pill styling as the event form save button while day-view add event matches chevrons', () => {
  assert.match(html, /\.back \{[^}]*height: 25\.5px;[^}]*font-size: 13px;[^}]*line-height: 1;[^}]*padding: 0 10px;[^}]*display: grid;[^}]*place-items: center;/s);
  assert.match(html, /\.todo-chip \{[^}]*height: 25\.5px;[^}]*box-sizing: border-box;[^}]*padding: 0 9px;[^}]*font-size: 13px;[^}]*line-height: 1;/s);
  assert.match(html, /\.submit button \{[^}]*border: 1px solid white;[^}]*background: white;[^}]*color: var\(--ink\);[^}]*border-radius: 999px;[^}]*min-height: 25\.5px;[^}]*padding: 0 10px;/s);
  assert.match(html, /\.itinerary-heading \.secondary-action \{[^}]*border: 1px solid white;[^}]*background: white;[^}]*color: var\(--ink\);[^}]*height: 25\.5px;[^}]*min-height: 0;[^}]*box-sizing: border-box;[^}]*border-radius: 999px;[^}]*padding: 0 12px;[^}]*display: inline-grid;[^}]*place-items: center;[^}]*cursor: pointer;/s);
  assert.match(html, /\.itinerary-heading \.secondary-action:hover \{ cursor: pointer; \}/);
  assert.match(html, /\.day-view-add-event \{[^}]*bottom: 16px;[^}]*height: 44px;[^}]*min-height: 44px;[^}]*box-sizing: border-box;[^}]*padding: 0 18px;[^}]*display: inline-grid;[^}]*place-items: center;/s);
  assert.match(html, /\.day-view-nav-button \{[^}]*width: 44px;[^}]*height: 44px;[^}]*min-height: 44px;[^}]*padding: 0;[^}]*font-size: 24px;[^}]*display: inline-grid;[^}]*place-items: center;/s);
  assert.match(html, /\.day-view-chevron \{[^}]*display: block;[^}]*line-height: 1;[^}]*transform: translateY\(-\.06em\);/s);
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
  assert.match(html, /function formatNameList\(names\)\{ if\(names\.length<=1\) return names\[0\]\|\|''; if\(names\.length===2\) return `\$\{names\[0\]\} and \$\{names\[1\]\}`; return `\$\{names\.slice\(0,-1\)\.join\(', '\)\}, and \$\{names\.at\(-1\)\}`; \}/);
  assert.match(html, /return `with \$\{formatNameList\(companions\)\}`/);
  assert.doesNotMatch(html, /companions\.join\(' \+ '\)/);
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
  assert.match(html, /<div class="board-tabs" role="tablist" aria-label="Flight board">\s*<span class="board-tab-indicator" id="flightTabIndicator" aria-hidden="true"><\/span>/);
  assert.match(html, /flightTabIndicator=document\.getElementById\('flightTabIndicator'\)/);
  assert.match(html, /function syncFlightTabIndicator\(active=arrivalsTab\)/);
  assert.match(html, /function setBoardMode\(mode\)\{[^}]*syncFlightTabIndicator\(mode==='departures'\?departuresTab:arrivalsTab\)/);
  assert.match(html, /function openDashboard\(\)\{[\s\S]*requestAnimationFrame\(\(\)=>syncFlightTabIndicator\(boardMode==='departures'\?departuresTab:arrivalsTab\)\)/);
  assert.match(html, /\.arrival-row \{[^}]*position: relative;[^}]*grid-template-columns: minmax\(86px, 1fr\) minmax\(190px, 1\.45fr\) minmax\(86px, \.8fr\) minmax\(104px, \.72fr\)/s);
  assert.match(html, /\.arrival-actions \{[^}]*position: absolute;[^}]*top: 8px;[^}]*right: 8px;[^}]*display: inline-flex;/s);
  assert.match(html, /\.arrival-edit \{[^}]*height: 25\.5px;[^}]*width: auto;[^}]*border-radius: 999px;[^}]*background: rgba\(255,255,255,\.14\);[^}]*padding: 0 10px;[^}]*font-size: 13px;[^}]*opacity: 1;[^}]*pointer-events: auto;/s);
  assert.match(html, /\.notes-toggle \{ width: 25\.5px; height: 25\.5px;/);
  assert.match(html, /@media \(max-width: 760px\) \{[\s\S]*\.arrival-edit \{ height: 25\.5px; min-height: 0; width: auto; padding: 0 10px; \}[\s\S]*\.arrival-actions \.notes-toggle \{ width: 25\.5px; height: 25\.5px; min-height: 0; flex: 0 0 25\.5px; \}/);
  assert.match(html, /@media \(max-width: 760px\) \{[\s\S]*\.board-tab-indicator \{[^}]*display: none/);
  assert.doesNotMatch(html, /\.trip-tabs \.board-tab-indicator \{ display: none; \}/);
  assert.doesNotMatch(html, /\.arrival-edit, \.notes-toggle \{ height: 44px; \}/);
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
  assert.match(html, /\.arrival-edit \{[^}]*height: 25\.5px;[^}]*width: auto;[^}]*opacity: 1;[^}]*pointer-events: auto;/s);
  assert.match(html, /\.notes-toggle \{ width: 25\.5px; height: 25\.5px;/);
  assert.match(html, /@media \(max-width: 760px\) \{[\s\S]*\.arrival-actions \{ top: 12px; right: 12px; \}[\s\S]*\.arrival-edit \{ height: 25\.5px; min-height: 0; width: auto; padding: 0 10px; \}[\s\S]*\.arrival-actions \.notes-toggle \{ width: 25\.5px; height: 25\.5px; min-height: 0; flex: 0 0 25\.5px; \}/);
  assert.match(html, /@media \(max-width: 760px\) \{[\s\S]*\.arrival-notes \{[^}]*grid-column: 1 \/ -1;[^}]*width: calc\(100% \+ 104px\);[^}]*max-width: calc\(100% \+ 104px\);/);
  assert.match(html, /<div class="arrival-meta"><span class="arrival-time">\$\{escapeHtml\(dateTime\)\}<\/span><span class="arrival-airport">\$\{escapeHtml\(airport\)\}<\/span><\/div>/);
  assert.match(html, /const countdownLabel=has \? `\$\{isDepart\?'Departs':'Arrives'\} in \$\{countdownFor\(d,boardMode\)\}` : 'Awaiting flights'/);
  assert.match(html, /<div class="arrival-countdown">\$\{escapeHtml\(countdownLabel\)\}<\/div>/);
});

test('mobile dashboard keeps todo chips sticky while trip cards and itinerary scroll', () => {
  assert.match(html, /dashboardGuestName\.textContent=name \? `Hi, \$\{name\}\. \$\{hasOutstandingTodos \? 'You have a task to complete\.' : 'You’re all caught up\.'\}` : 'Hi'/);
  const tripInfoBlock = html.slice(html.indexOf('id="tripInfo"'), html.indexOf('id="dinnerPicker"'));
  assert.match(tripInfoBlock, /<header><div><h2 class="dashboard-name" id="dashboardGuestName">Hi<\/h2><div class="dashboard-status" id="dashboardStatus"/);
  assert.match(tripInfoBlock, /<div class="trip-info-scroll">[\s\S]*?<div class="dashboard-hero">/);
  assert.match(tripInfoBlock, /<section class="calendar-list embedded-itinerary" id="calendarItems" aria-label="Trip itinerary"><\/section>[\s\S]*?<\/section>/);
  assert.match(html, /#tripInfo \.dashboard-card header \{ flex: 0 0 auto; \}/);
  assert.match(html, /#tripInfo \.dashboard-card \{ height: min\(88svh, 760px\); \}/);
  assert.doesNotMatch(html, /#tripInfo \.dashboard-card \{[^}]*padding-bottom: 64px;/s);
  assert.match(html, /#tripInfo \.trip-info-scroll \{ flex: 1 1 auto; overflow: hidden; min-height: 0; display: flex; flex-direction: column; gap: 10px; scrollbar-width: none; -ms-overflow-style: none; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; \}/);
  assert.match(html, /#tripInfo \.calendar-list \{ overflow: visible; min-height: auto; \}/);
  assert.match(html, /#tripInfo \.trip-info-scroll::-webkit-scrollbar \{ width: 0; height: 0; display: none; \}/);
});

test('mobile todo chips stay bounded and horizontally scrollable without pushing the title wide', () => {
  assert.match(html, /\.dashboard-card header > div \{ min-width: 0; flex: 1 1 auto; overflow: hidden; \}/);
  assert.match(html, /\.dashboard-name \{[^}]*overflow-wrap: anywhere/);
  assert.match(html, /@media \(max-width: 760px\) \{[\s\S]*#tripInfo \.dashboard-card header \{[^}]*position: relative;[^}]*display: block;[^}]*padding-right: 56px;[^}]*overflow: visible;/);
  assert.match(html, /@media \(max-width: 760px\) \{[\s\S]*#tripInfo \.dashboard-card header > div \{[^}]*overflow: visible;[^}]*width: 100%;[^}]*max-width: 100%;/);
  assert.match(html, /@media \(max-width: 760px\) \{[\s\S]*#tripInfo \.dashboard-card header \.close \{[^}]*position: absolute;[^}]*top: 0;[^}]*right: 0;/);
  assert.match(html, /@media \(max-width: 760px\) \{[\s\S]*#tripInfo \.dashboard-status \{[^}]*width: calc\(100% \+ 90px\);[^}]*max-width: calc\(100% \+ 90px\);[^}]*margin-left: -17px;[^}]*padding-left: 17px;[^}]*scroll-padding-left: 17px;/);
  assert.match(html, /@media \(max-width: 760px\) \{[\s\S]*\.dashboard-status \{[^}]*flex-wrap: nowrap;[^}]*overflow-x: auto;[^}]*overflow-y: hidden;[^}]*max-height: 30px;[^}]*white-space: nowrap;[^}]*touch-action: pan-x;/);
  assert.match(html, /@media \(max-width: 760px\) \{[\s\S]*\.dashboard-status \.todo-chip \{ flex: 0 0 auto; \}/);
  assert.doesNotMatch(html, /dashboardStatus\.classList\.toggle\('show-done'/);
  assert.doesNotMatch(html, /\.dashboard-status:not\(\.show-done\) \.todo-chip\.done \{ display: none; \}/);
});

test('itinerary only renders claimed dinners as two-hour Dinner events', () => {
  assert.match(html, /const dinners=dinnerPlan\(\)\.slots\.filter\(slot=>\(slot\.leads \|\| \[\]\)\.length\)/);
  assert.match(html, /dinners\.forEach\(slot=>eventsByDate\[slot\.date\]\?\.push\(\{title:'Dinner'/);
  assert.match(html, /meta:`\$\{DINNER_TIME\} · \$\{\(slot\.leads \|\| \[\]\)\.join\(' \+ '\)\}/);
  assert.match(html, /hour:DINNER_HOUR,duration:120/);
  assert.doesNotMatch(html, /Dinner responsibility/);
  assert.doesNotMatch(html, /Dinner placeholder/);
  assert.doesNotMatch(html, /dinnerDates\.forEach\(date=>eventsByDate\[date\]\.push/);
});

test('day view titles omit year and hide edge navigation instead of disabling it', () => {
  assert.match(html, /const full=d\.toLocaleDateString\(undefined,\{weekday:'long', month:'long', day:'numeric'\}\)/);
  assert.doesNotMatch(html, /dayViewTitle\.textContent=full;[\s\S]{0,120}year:'numeric'/);
  assert.match(html, /previousDayViewButton\.hidden=index<=0/);
  assert.match(html, /nextDayViewButton\.hidden=index>=allDays\.length-1/);
  assert.doesNotMatch(html, /previousDayViewButton\.disabled=index<=0/);
  assert.doesNotMatch(html, /nextDayViewButton\.disabled=index>=allDays\.length-1/);
});


test('hour-by-hour day view spans 6 AM through 10 PM', () => {
  assert.match(html, /const DAY_VIEW_START_MINUTE=6\*60/);
  assert.match(html, /const DAY_VIEW_END_MINUTE=22\*60/);
  assert.match(html, /const DAY_VIEW_HOUR_COUNT=\(DAY_VIEW_END_MINUTE-DAY_VIEW_START_MINUTE\)\/60/);
  assert.match(html, /const DAY_VIEW_HOUR_LABEL_COUNT=DAY_VIEW_HOUR_COUNT\+1/);
  assert.match(html, /\.day-view-timeline \{[^}]*min-height: 1020px;/s);
  assert.match(html, /\.day-view-hours \{[^}]*grid-template-rows: repeat\(17, 60px\)/s);
  assert.match(html, /function dayViewHours\(\)\{ return Array\.from\(\{length:DAY_VIEW_HOUR_LABEL_COUNT\}/);
  assert.match(html, /const hour=6\+i/);
  assert.match(html, /parseEventMinute\(event\)-DAY_VIEW_START_MINUTE/);
  assert.doesNotMatch(html, /parseEventMinute\(event\)-480/);
  assert.doesNotMatch(html, /Array\.from\(\{length:14\}/);
});

test('custom calendar event form captures title, time range, invite mode, invitees, attendees, and description', () => {
  assert.match(html, /id="eventPlanner"/);
  assert.match(html, /id="eventForm"/);
  assert.match(html, /<label for="eventTitle">Title<\/label><input id="eventTitle"/);
  assert.match(html, /<label for="eventStartTime">Start time<\/label><input id="eventStartTime" type="time" step="300" required>/);
  assert.match(html, /<label for="eventEndTime">End time<\/label><input id="eventEndTime" type="time" step="300" required>/);
  assert.match(html, /function addMinutesToTime\(value, minutes\)/);
  assert.match(html, /function defaultEventEndTime\(\)\{[^}]*eventEndTime\.value=addMinutesToTime\(eventStartTime\.value,60\)/);
  assert.match(html, /eventStartTime\.addEventListener\('change',defaultEventEndTime\)/);
  assert.match(html, /<label for="eventDescription">Description<\/label><textarea id="eventDescription"/);
  assert.match(html, /<label for="eventInviteMode">Invite type<\/label><select id="eventInviteMode" required>/);
  assert.match(html, /<option value="open">Open invite<\/option>/);
  assert.match(html, /<option value="invite-only">Invite only<\/option>/);
  assert.match(html, /id="eventInvitees" multiple hidden/);
  assert.match(html, /button type="button" class="event-invitee-control" id="eventInviteeControl"/);
  assert.match(html, /<span id="eventInviteeSummary">No invitees<\/span>/);
  assert.match(html, /id="eventInviteeOptions"/);
  assert.match(html, /\.event-invitee-control \{[^}]*min-height: 44px;[^}]*height: auto;/s);
  assert.match(html, /\.event-invitee-control \{[^}]*white-space: normal;/s);
  assert.doesNotMatch(html, /\.event-invitees-field select \{ min-height: 104px;/);
  assert.match(html, /function populateEventInvitees\(\)/);
  assert.match(html, /function formatInviteeSummary\(names\)\{ if\(!names\.length\) return 'No invitees'; return formatNameList\(names\); \}/);
  assert.doesNotMatch(html, /return formatNameList\(\['me',\.\.\.names\]\)/);
  assert.match(html, /function syncEventInviteMode\(\)/);
  assert.match(html, /eventInviteMode\.addEventListener\('change',syncEventInviteMode\)/);
  assert.match(html, /eventForm\.addEventListener\('submit',saveCustomEvent\)/);
});

test('custom calendar events render with title, time range, attendees, description, visibility, open signup, and calendar download', () => {
  assert.match(html, /const CUSTOM_EVENTS_KEY='korculaCustomCalendarEvents'/);
  assert.match(html, /const CUSTOM_EVENT_SIGNUPS_KEY='korculaCustomCalendarEventSignups'/);
  assert.match(html, /function customEvents\(\)/);
  assert.match(html, /function visibleCustomEvents\(\)/);
  assert.match(html, /event\.inviteMode==='open' \|\| event\.creator===name \|\| \(event\.invitees \|\| \[\]\)\.includes\(name\)/);
  assert.match(html, /customEventAttendeeNames\(event\)/);
  assert.match(html, /formatEventTimeRange\(event\.startTime,event\.endTime\)/);
  assert.match(html, /description:eventDescription\.value\.trim\(\)/);
  assert.match(html, /createdAt:existing\?\.createdAt \|\| now/);
  assert.match(html, /updatedAt:now/);
  assert.match(html, /renderCustomEventActions\(event\.id\)/);
  assert.match(html, /data-custom-event-signup/);
  assert.match(html, /function downloadCustomEventToCalendar\(event\)/);
  assert.match(html, /DTSTART;TZID=Europe\/Zagreb:\$\{icsDateTime\(event\.date,event\.startTime\)\}/);
  assert.match(html, /DTEND;TZID=Europe\/Zagreb:\$\{icsDateTime\(event\.date,event\.endTime\)\}/);
  assert.match(html, /DESCRIPTION:\$\{icsEscape\(event\.description \|\| ''\)\}/);
  assert.match(html, /data-custom-event-calendar/);
});

test('calendar day cards show per-user unseen custom event badges that clear when the day is opened', () => {
  assert.match(html, /const CUSTOM_EVENT_SEEN_KEY='korculaCustomCalendarEventSeenByDay'/);
  assert.match(html, /function currentEventSeenKey\(\)/);
  assert.match(html, /return `\$\{CUSTOM_EVENT_SEEN_KEY\}:\$\{currentActivityName\(\) \|\| rememberedName\(\) \|\| 'anonymous'\}`/);
  assert.match(html, /function readEventSeenByDay\(\)/);
  assert.match(html, /function saveEventSeenByDay\(value\)/);
  assert.match(html, /function markDayEventsSeen\(date\)/);
  assert.match(html, /seen\[date\]=new Date\(\)\.toISOString\(\)/);
  assert.match(html, /function unseenEventsForDate\(date, events\)/);
  assert.match(html, /event\.custom && event\.updatedAt && event\.updatedAt>lastSeen/);
  assert.match(html, /function unseenDayBadge\(date, events\)/);
  assert.match(html, /const count=unseenEventsForDate\(date, events\)\.length/);
  assert.match(html, /count===1 \? '<span class="calendar-unseen-badge is-dot" aria-label="1 unseen calendar update"><\/span>' : `<span class="calendar-unseen-badge" aria-label="\$\{count\} unseen calendar updates">\$\{count\}<\/span>`/);
  assert.match(html, /\$\{unseenDayBadge\(date, dayEvents\)\}/);
  assert.match(html, /function openDayView\(date\)\{[^}]*activeDayUnseenEventIds=new Set\(unseenEventsForDate\(date, events\)\.map\(event=>event\.id\)\)/s);
  assert.match(html, /function openDayView\(date\)\{[^}]*markDayEventsSeen\(date\)/s);
  assert.match(html, /\.calendar-unseen-badge \{[^}]*background: rgba\(41, 143, 184, \.6\);[^}]*border: 1px solid rgba\(255,255,255,\.14\);[^}]*box-shadow: 0 4px 10px rgba\(5,34,48,\.18\);/s);
  assert.doesNotMatch(html, /background: linear-gradient\(135deg, #f28b6b, #b7412e\)/);
  assert.match(html, /\.calendar-unseen-badge\.is-dot \{[^}]*width: 10px;[^}]*height: 10px;[^}]*font-size: 0;/s);
});

test('unseen custom events keep a subtle dot on the event block after opening the day', () => {
  assert.match(html, /let activeDayUnseenEventIds=new Set\(\)/);
  assert.match(html, /function unseenEventBlockDot\(event\)/);
  assert.match(html, /activeDayUnseenEventIds\.has\(event\.id\)/);
  assert.match(html, /<span class="event-unseen-dot" aria-label="New update"><\/span>/);
  assert.match(html, /\.event-unseen-dot \{[^}]*background: rgba\(41, 143, 184, \.6\);[^}]*box-shadow: 0 3px 8px rgba\(5,34,48,\.14\);/s);
  assert.match(html, /\$\{unseenEventBlockDot\(event\)\}<strong>\$\{escapeHtml\(event\.title\)\}<\/strong>/);
});

test('unseen calendar badges only count custom events visible to the current invitee', () => {
  assert.match(html, /visibleCustomEvents\(\)\.forEach\(event=>eventsByDate\[event\.date\]\?\.push\(event\)\)/);
  assert.match(html, /function customEventVisibleTo\(event, name=currentActivityName\(\)\)/);
  assert.match(html, /event\.inviteMode==='open' \|\| event\.creator===name \|\| \(event\.invitees \|\| \[\]\)\.includes\(name\)/);
  assert.match(html, /unseenEventsForDate\(date, events\)\{ const lastSeen=readEventSeenByDay\(\)\[date\] \|\| ''; return \(events \|\| \[\]\)\.filter\(event=>event\.custom && event\.updatedAt && event\.updatedAt>lastSeen\); \}/);
  assert.doesNotMatch(html, /customEvents\(\)\.filter\([^)]*updatedAt[^)]*lastSeen/);
});

test('staging-only unread demo can seed one-event and two-event days safely', () => {
  assert.match(html, /function seedStagingUnreadDemo\(\)/);
  assert.match(html, /if\(!isStagingReviewHost\(window\.location\.hostname\) \|\| !params\.has\('unreadDemo'\)\) return ''/);
  assert.match(html, /title:'Unread demo: one update'/);
  assert.match(html, /title:'Unread demo: first of two'/);
  assert.match(html, /title:'Unread demo: second of two'/);
  assert.match(html, /inviteMode:'invite-only'/);
  assert.match(html, /invitees:\[currentActivityName\(\) \|\| 'Tanner','David'\]/);
  assert.match(html, /saveCustomEvents\(\[\.\.\.demoEvents, \.\.\.customEvents\(\)\.filter\(event=>!demoEvents\.some\(demo=>demo\.id===event\.id\)\)\]\)/);
  assert.match(html, /localStorage\.removeItem\(currentEventSeenKey\(\)\)/);
  assert.match(html, /seedStagingUnreadDemo\(\)/);
});

test('custom event form scrolls on short viewports and preserves field focus outlines', () => {
  assert.match(html, /#eventPlanner \.dashboard-card \{[^}]*overflow: hidden;/s);
  assert.match(html, /#eventPlanner \.dinner-form \{[^}]*overflow-y: auto;[^}]*min-height: 0;/s);
  assert.match(html, /#eventPlanner \.dinner-form \{[^}]*padding: 4px 8px 12px;[^}]*margin: -4px 0 0;/s);
  assert.match(html, /#eventPlanner input:focus, #eventPlanner select:focus, #eventPlanner textarea:focus \{[^}]*outline: 2px solid rgba\(255,255,255,\.78\);[^}]*outline-offset: 2px;/s);
  assert.match(html, /<button type="button" class="event-invitee-control" id="eventInviteeControl" aria-expanded="false" aria-controls="eventInviteeOptions"><span id="eventInviteeSummary">No invitees<\/span><\/button>/);
  assert.match(html, /id="eventInvitees" multiple hidden/);
  assert.match(html, /class="event-invitee-options" id="eventInviteeOptions" hidden/);
  assert.match(html, /function selectedInviteeNames\(\)/);
  assert.match(html, /function formatInviteeSummary\(names\)/);
  assert.match(html, /if\(!names\.length\) return 'No invitees'/);
  assert.match(html, /return formatNameList\(names\)/);
  assert.doesNotMatch(html, /return formatNameList\(\['me',\.\.\.names\]\)/);
  assert.match(html, /function syncEventInviteeSummary\(\)/);
  assert.match(html, /eventInvitees\.addEventListener\('change',syncEventInviteeSummary\)/);
  assert.doesNotMatch(html, /No attendees yet/);
});

test('open invite custom events prompt a share message with a deep event link', () => {
  assert.match(html, /function openInviteShareMessage\(event\)/);
  assert.match(html, /I just added \$\{event\.title\} to the calendar\. Sign up if you’re interested!/);
  assert.match(html, /function customEventShareUrl\(event\)/);
  assert.match(html, /calendarEvent/);
  assert.match(html, /encodeSharedEvent\(event\)/);
  assert.match(html, /navigator\.share\(\{ title:event\.title, text:openInviteShareMessage\(event\), url:customEventShareUrl\(event\) \}\)/);
  assert.match(html, /promptShareOpenInviteEvent\(event\)/);
  assert.match(html, /if\(event\.inviteMode==='open'\)/);
});

test('custom event time ranges include spaces around the dash', () => {
  assert.match(html, /function formatEventTimeRange\(startTime,endTime\)\{ return `\$\{formatClock\(startTime\)\} – \$\{formatClock\(endTime\)\}`; \}/);
  assert.doesNotMatch(html, /formatClock\(startTime\)\}–\$\{formatClock\(endTime\)/);
});

test('custom event detail lets creators edit and delete instead of showing joined', () => {
  assert.match(html, /data-custom-event-edit/);
  assert.match(html, />Edit<\/button>/);
  assert.match(html, /id="deleteCustomEvent"/);
  assert.match(html, /type="button" id="deleteCustomEvent" hidden>Delete<\/button>/);
  assert.doesNotMatch(html, />Delete event<\/button>/);
  assert.match(html, /\.destructive-text \{[^}]*color: rgba\(255,107,107,\.72\) !important;[^}]*opacity: \.72;/s);
  assert.match(html, /\.destructive-text:hover, \.destructive-text:focus-visible \{[^}]*color: #ff8f8f;[^}]*opacity: 1;/s);
  assert.match(html, /function openEventPlanner\(date='', eventId='', backTarget=activeDayViewDate\?'dayView':'tripInfo'\)\{ setReturnTarget\(backTarget\);/);
  assert.match(html, /let editingCustomEventId=''/);
  assert.match(html, /function fillCustomEventForm\(event\)/);
  assert.match(html, /function deleteCustomEvent\(\)/);
  assert.match(html, /saveCustomEvents\(customEvents\(\)\.filter\(event=>event\.id!==editingCustomEventId\)\)/);
  assert.match(html, /deleteCustomEventButton\.addEventListener\('click',deleteCustomEvent\)/);
  assert.match(html, /dayEventDetailActions\.querySelectorAll\('\[data-custom-event-edit\]'\)/);
  assert.match(html, /data-custom-event-calendar/);
  assert.doesNotMatch(html, />Joined<\/button>/);
});

test('custom event descriptions linkify pasted URLs safely in cards and detail', () => {
  assert.match(html, /function linkifyText\(value\)/);
  assert.match(html, /escapeHtml\(value\)/);
  assert.match(html, /https?:\/\/[^\s<]+/);
  assert.match(html, /<a href="\$\{safeHref\}" target="_blank" rel="noopener noreferrer">\$\{url\}<\/a>/);
  assert.match(html, /\$\{event\.description \? `<span>\$\{linkifyText\(event\.description\)\}<\/span>` : ''\}/);
  assert.match(html, /\$\{event\.description \? `<small>\$\{linkifyText\(event\.description\)\}<\/small>` : ''\}/);
  assert.match(html, /dayEventDetailNote\.innerHTML=linkifyText\(event\.description \|\| event\.note \|\| ''\)/);
  assert.match(html, /\.day-event-detail-note a, \.calendar-event a, \.day-view-event a \{[^}]*color: rgba\(255,255,255,\.86\);[^}]*text-decoration: underline;/s);
  assert.doesNotMatch(html, /dayEventDetailNote\.textContent=event\.description \|\| event\.note \|\| ''/);
});

test('calendar event detail has a top-right share icon reduced 25 percent from doubled size', () => {
  assert.match(html, /<button class="day-event-share calendar-expand-icon" id="dayEventShare" type="button" title="Share event" aria-label="Share event" hidden>[\s\S]*<svg[^>]*viewBox="0 0 24 24"[^>]*>[\s\S]*<\/svg><\/button><h3 id="dayEventDetailTitle">Event<\/h3>/);
  assert.match(html, /\.calendar-expand-icon \{[^}]*width: 22px;[^}]*height: 22px;[^}]*padding: 3px;[^}]*opacity: \.2;/s);
  assert.match(html, /\.day-event-share \{[^}]*top: 10px;[^}]*right: 10px;[^}]*width: 33px;[^}]*height: 33px;[^}]*padding: 4\.5px;/s);
  assert.doesNotMatch(html, /\.day-event-share \{[^}]*width: 44px;[^}]*height: 44px;[^}]*padding: 6px;/s);
  assert.match(html, /dayEventShareButton=document\.getElementById\('dayEventShare'\)/);
  assert.match(html, /dayEventShareButton\.hidden=false/);
  assert.match(html, /dayEventShareButton\.onclick=\(\)=>shareDayEvent\(event\)/);
  assert.match(html, /async function shareDayEvent\(event\)/);
  assert.match(html, /event\.custom\?customEventShareUrl\(event\):window\.location\.origin\+window\.location\.pathname/);
});

test('shared custom event links import the event and open signup or decline actions', () => {
  assert.match(html, /function decodeSharedEvent\(value\)/);
  assert.match(html, /function importSharedCalendarEventFromUrl\(\)/);
  assert.match(html, /new URLSearchParams\(window\.location\.search\)\.get\('calendarEvent'\)/);
  assert.match(html, /saveCustomEvents\(\[\{ \.\.\.event, createdAt:event\.createdAt \|\| new Date\(\)\.toISOString\(\), updatedAt:event\.updatedAt \|\| new Date\(\)\.toISOString\(\) \}, \.\.\.events\.filter\(item=>item\.id!==event\.id\)\]\)/);
  assert.match(html, /function openLinkedCalendarEvent\(eventId\)/);
  assert.match(html, /openDayView\(event\.date\)/);
  assert.match(html, /openDayEventDetail\(index\)/);
  assert.match(html, /function setCustomEventDecline\(eventId\)/);
  assert.match(html, /data-custom-event-decline/);
  assert.match(html, /\$\{declineLabel\}<\/button>/);
  assert.match(html, /openLinkedCalendarEvent\(sharedEventId\)/);
});

test('overlapping day-view events are grouped into side-by-side pressure columns', () => {
  assert.match(html, /function eventsOverlap\(a,b\)/);
  assert.match(html, /function layoutDayViewEvents\(events\)/);
  assert.match(html, /overlapGroup/);
  assert.match(html, /overlapColumn/);
  assert.match(html, /overlapColumns/);
  assert.match(html, /function eventBlockStyle\(event\)/);
  assert.ok(html.includes('left:calc(10px + ${event.overlapColumn||0}*((100% - 18px)/${event.overlapColumns||1}))'));
  assert.ok(html.includes('width:calc((100% - 18px)/${event.overlapColumns||1} - 6px)'));
  assert.match(html, /const laidOutEvents=layoutDayViewEvents\(activeDayViewEvents\)/);
  assert.match(html, /laidOutEvents\.map\(\(event,index\)=>renderExpandedDayEvent\(event, full\)/);
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
  assert.match(html, /if\(returnTarget==='dayView'\) openDayView\(activeDayViewDate\);/);
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
  assert.match(html, /cacheDinnerPlan\(data\.meals \|\| dinnerPlan\(\)\); populateDinnerSelectors\(\); renderTripDashboard\(\); setPrimaryCta\(\);/);
  assert.match(html, /const hasOutstandingTodos=!flights \|\| !myDinner \|\| localStorage\.getItem\(CALENDAR_KEY\)!=='true'/);
});

test('grocery card replaces trip prep with dietary preferences and a shared categorized grocery list', () => {
  const tripInfoBlock = html.slice(html.indexOf('id="tripInfo"'), html.indexOf('id="dinnerPicker"'));
  assert.match(tripInfoBlock, /id="prepStatusChip"/);
  assert.match(tripInfoBlock, /id="myPrepCard"/);
  assert.match(tripInfoBlock, /Grocery list/);
  assert.match(tripInfoBlock, /Dietary notes and shared groceries/);
  assert.match(html, /id="prepPlanner"/);
  assert.match(html, /id="prepPlannerTitle">Groceries<\/h2>/);
  assert.match(html, /id="dietaryField"/);
  assert.match(html, /class="field full dietary-preference-card"/);
  assert.match(html, /id="dietaryNotes"/);
  assert.match(html, /<\/textarea><div class="dietary-confirmation-row"><button class="dietary-save-action" id="saveDietaryPreferences" type="submit">Save<\/button><button class="dietary-edit-action" id="editDietaryPreferences" type="button" hidden>Edit<\/button><\/div><\/div>/);
  assert.match(html, /id="groceryItem"/);
  assert.match(html, /id="addGroceryItem"/);
  assert.match(html, /class="grocery-add-action" id="addGroceryItem"/);
  assert.match(html, /id="groceryList"/);
  assert.match(html, /id="groceryEmpty"/);
  assert.doesNotMatch(html, /id="exportGroceriesReminders"/);
  assert.doesNotMatch(html, /Export to Reminders/);
  assert.doesNotMatch(html, /Save groceries/);
  assert.doesNotMatch(html, /id="prepChecklist"/);
  assert.doesNotMatch(html, /data-prep-item="passport"|Passport checked|Swimsuit packed|Power adapter packed|Sunscreen \/ hat ready|Ferry \/ transport plan reviewed/);
  assert.doesNotMatch(html, /id="tripWish"|id="activityInterest"|One thing you want from the trip|Activity you’re most interested in/);
});

test('grocery state is shared through the groceries API with local fallback and participates in dashboard CTAs', () => {
  assert.match(html, /const GROCERY_STATE_KEY='korculaGroceryState'/);
  assert.match(html, /let cachedGroceries=readLocalGroceries\(\)/);
  assert.match(html, /function readLocalGroceries\(\)/);
  assert.match(html, /function cacheGroceries\(state\)/);
  assert.match(html, /async function loadGroceryState\(\)/);
  assert.match(html, /async function saveGroceryState\(\{ quiet=false \}=\{\}\)/);
  assert.match(html, /function saveGroceryStateQuiet\(\)/);
  assert.match(html, /function groceryComplete\(\)/);
  assert.match(html, /function addGroceryItemFromInput\(\)/);
  assert.match(html, /function toggleGroceryPlusOne\(itemId\)/);
  assert.match(html, /function removeGroceryItem\(itemId\)/);
  assert.match(html, /function currentGroceryPerson\(\)/);
  assert.match(html, /function groceryRequesterNames\(item\)/);
  assert.match(html, /function groceryItemMatchesText\(item, text\)/);
  assert.match(html, /function syncDietaryPreferenceCard\(\{ editing=false \}=\{\}\)/);
  assert.match(html, /const hasPreference=Boolean\(dietaryNotes\.value\.trim\(\)\)/);
  assert.match(html, /dietaryField\.classList\.toggle\('is-saved', hasPreference&&!editing\)/);
  assert.match(html, /dietaryNotes\.readOnly=hasPreference&&!editing/);
  assert.doesNotMatch(html, /dietarySavedMessage/);
  assert.doesNotMatch(html, /Saved to your profile\./);
  assert.match(html, /saveDietaryPreferencesButton\.hidden=hasPreference&&!editing/);
  assert.match(html, /editDietaryPreferencesButton\.hidden=!\(hasPreference&&!editing\)/);
  assert.match(html, /function editDietaryPreference\(\)\{ syncDietaryPreferenceCard\(\{ editing:true \}\); dietaryNotes\.focus\(\); \}/);
  assert.match(html, /editDietaryPreferencesButton\.addEventListener\('click',editDietaryPreference\)/);
  assert.match(html, /syncDietaryPreferenceCard\(\); if\(!quiet\) showToast\('Saved'\);/);
  assert.match(html, /\.dietary-preference-card\.is-saved \{[^}]*border-color: transparent;[^}]*background: transparent;/s);
  assert.doesNotMatch(html, /\.dietary-preference-card\.is-saved \{[^}]*background: rgba\(255,255,255,\.08\)/s);
  assert.match(html, /\.dietary-preference-card\.is-saved #dietaryNotes \{[^}]*height: 44px;[^}]*min-height: 44px;[^}]*padding: 0 78px 0 10px;[^}]*line-height: 44px;[^}]*resize: none;/s);
  assert.match(html, /\.dietary-preference-card\.is-saved \.dietary-confirmation-row \{[^}]*height: 0;[^}]*min-height: 0;[^}]*margin-top: 0;/s);
  assert.doesNotMatch(html, /\.dietary-saved-message/);
  assert.match(html, /\.dietary-edit-action \{[^}]*position: absolute;[^}]*right: 10px;[^}]*top: calc\(13px \+ 6px \+ 28px\);[^}]*transform: translateY\(-50%\);[^}]*z-index: 9999;[^}]*isolation: isolate;[^}]*border: 1px solid white;[^}]*color: white;[^}]*opacity: 1;[^}]*pointer-events: auto;/s);
  assert.doesNotMatch(html, /\.dietary-edit-action \{[^}]*opacity: \.2;/s);
  assert.doesNotMatch(html, /\.dietary-edit-action \{[^}]*top: calc\(13px \+ 6px \+ 25px\)/s);
  assert.doesNotMatch(html, /\.dietary-edit-action \{[^}]*border: 1px solid rgba\(255,255,255,\.24\)/s);
  assert.doesNotMatch(html, /\.dietary-edit-action \{[^}]*color: rgba\(255,255,255,\.86\)/s);
  assert.match(html, /\.dietary-edit-action:hover, \.dietary-edit-action:focus-visible \{[^}]*opacity: 1;[^}]*border-color: white;/s);
  assert.doesNotMatch(html, /\.dietary-preference-card\.is-saved:hover \.dietary-edit-action[^{]*\{[^}]*opacity: 1/s);
  assert.match(html, /fetch\('\/api\/groceries'/);
  assert.match(html, /fetch\('\/api\/groceries', \{ method:'POST'/);
  assert.match(html, /renderTodoChip\(prepStatusChip, groceryComplete\(\), 'Groceries noted', 'Add grocery notes'\)/);
  assert.match(html, /if\(!groceryComplete\(\)\) return 'Add grocery notes'/);
  assert.match(html, /if\(next==='Add grocery notes'\) return openPrepPlanner\(\)/);
  assert.match(html, /addGroceryItemButton\.addEventListener\('click',addGroceryItemFromInput\)/);
  assert.match(html, /\$\{!isOwner\?`<button class="grocery-plus-one \$\{already\?'is-added':''\}"/);
  assert.match(html, /data-grocery-plus-one="\$\{escapeHtml\(item\.id\)\}"/);
  assert.match(html, /aria-pressed="\$\{already\?'true':'false'\}"/);
  assert.match(html, /class="grocery-plus-one \$\{already\?'is-added':''\}"/);
  assert.match(html, /data-grocery-plus-one="\$\{escapeHtml\(item\.id\)\}">\+1<\/button>/);
  assert.doesNotMatch(html, /Remove \+1/);
  assert.match(html, /\$\{isOwner\?`<button class="grocery-remove"/);
  assert.match(html, /requestedBy/);
  assert.match(html, /toggleGroceryPlusOne\(plus\.dataset\.groceryPlusOne\)/);
  assert.match(html, /removeGroceryItem\(btn\.dataset\.groceryRemove\)/);
  assert.match(html, /groceryList\.addEventListener\('click'/);
  assert.match(html, /const GROCERY_SECTIONS=\[/);
  assert.match(html, /name:'Produce',[\s\S]*onion[\s\S]*apple[\s\S]*berries[\s\S]*spinach[\s\S]*zucchini[\s\S]*mushroom/s);
  assert.match(html, /name:'Meat & Seafood',[\s\S]*steak[\s\S]*ground beef[\s\S]*chicken[\s\S]*salmon[\s\S]*shrimp/s);
  assert.match(html, /name:'Dairy & Eggs',[\s\S]*oat milk[\s\S]*feta[\s\S]*yogurt[\s\S]*eggs/s);
  assert.match(html, /name:'Pantry',[\s\S]*pasta[\s\S]*rice[\s\S]*flour[\s\S]*olive oil[\s\S]*beans/s);
  assert.match(html, /function grocerySectionFor\(text\)\{[\s\S]*normalizeGroceryText\(text\)[\s\S]*GROCERY_SECTIONS\.find/s);
  assert.match(html, /function groupedGroceryItems\(items\)/);
  assert.match(html, /grocery-section-heading/);
  assert.match(html, /\['Produce','Meat & Seafood','Dairy & Eggs','Bakery','Pantry','Frozen','Snacks','Drinks','Household','Other'\]/);
  assert.doesNotMatch(html, /function exportGroceriesToReminders\(\)/);
  assert.doesNotMatch(html, /reminders:\/\/x-callback-url\/add/);
  assert.doesNotMatch(html, /exportGroceriesReminders\.addEventListener/);
  assert.match(html, /\.prep-form \{[^}]*padding: 4px 8px 12px;[^}]*margin: -4px -8px 0;/s);
  assert.match(html, /\.grocery-input-row \{[^}]*align-items: end;[^}]*\}/s);
  assert.match(html, /\.grocery-input-control \{ display: grid; gap: 5px; \}/);
  assert.match(html, /<div class="grocery-input-control"><label for="groceryItem">Add grocery item<\/label><input id="groceryItem"/);
  assert.match(html, /\.grocery-add-action, \.dietary-save-action \{[^}]*border: 1px solid white;[^}]*background: white;[^}]*color: var\(--ink\);[^}]*border-radius: var\(--field-radius\);[^}]*height: 34px;[^}]*min-height: 34px;[^}]*box-sizing: border-box;[^}]*padding: 0 14px;/s);
  assert.match(html, /\.grocery-plus-one \{[^}]*opacity: \.2;[^}]*transition: opacity \.18s ease/s);
  assert.match(html, /\.grocery-plus-one\.is-added \{ opacity: 1;/);
  assert.doesNotMatch(html, /\.grocery-plus-one:disabled/);
  assert.match(html, /@media \(max-width: 760px\) \{[\s\S]*\.grocery-add-action, \.dietary-save-action \{ height: 44px; min-height: 44px; border-radius: 18px; padding: 0 16px; \}/s);
  assert.match(html, /prepStatusChip\.addEventListener\('click',openPrepPlanner\)/);
  assert.match(html, /myPrepCard\.addEventListener\('click',openPrepPlanner\)/);
  assert.match(html, /function dietaryLine\(person\)\{ const prefs=normalizeGroceries\(cachedGroceries\)\.preferences \|\| \{\}/);
  assert.doesNotMatch(html, /readTripPreferences/);
});

test('itinerary activity RSVPs show attendee names, declined state, and editable choices', () => {
  assert.match(html, /const ACTIVITY_SIGNUPS_KEY='korculaActivitySignups'/);
  assert.match(html, /const ACTIVITY_DECLINES_KEY='korculaActivityDeclines'/);
  assert.match(html, /const ACTIVITY_DELETED_KEY='korculaActivityDeleted'/);
  assert.match(html, /const activityEvents=\[\]/);
  assert.doesNotMatch(html, /id:'grocery-run'|Grocery run|stock the villa/);
  assert.doesNotMatch(html, /id:'boat-day'|Boat day candidate|boat rental or tour/);
  assert.doesNotMatch(html, /id:'beach-afternoon'|Beach afternoon|open swim block/);
  assert.match(html, /function activitySignups\(\)/);
  assert.match(html, /function activityDeclines\(\)/);
  assert.match(html, /function activityDeleted\(\)/);
  assert.match(html, /function deletedActivity\(activityId\)/);
  assert.match(html, /function activityRsvpState\(activityId\)/);
  assert.match(html, /function setActivityRsvp\(activityId, choice\)/);
  assert.match(html, /function deleteActivityEvent\(activityId\)/);
  assert.match(html, /function activityAttendeeNames\(activityId\)/);
  assert.match(html, /function activityAttendeeSummary\(activityId\)/);
  assert.match(html, /data-activity-signup="\$\{escapeHtml\(activityId\)\}"/);
  assert.match(html, /data-activity-decline="\$\{escapeHtml\(activityId\)\}"/);
  assert.match(html, /function renderActivityActions\(activityId, variant='detail'\)\{ const state=activityRsvpState\(activityId\);/);
  assert.match(html, /data-activity-signup="\$\{escapeHtml\(activityId\)\}" aria-pressed="\$\{state==='signed'\?'true':'false'\}"/);
  assert.match(html, /data-activity-decline="\$\{escapeHtml\(activityId\)\}" aria-pressed="\$\{state==='declined'\?'true':'false'\}"/);
  assert.match(html, /activity-signup is-primary \$\{state==='signed'\?'is-selected':''\} \$\{state==='declined'\?'is-unselected':''\}/);
  assert.match(html, /activity-signup is-muted \$\{state==='declined'\?'is-selected':''\} \$\{state==='signed'\?'is-unselected':''\}/);
  assert.match(html, /\.activity-signup\.is-unselected \{[^}]*opacity: \.2/);
  assert.match(html, /const signupLabel=state==='signed'\?'Signed up':'Sign up'/);
  assert.match(html, /const declineLabel=state==='declined'\?'Declined':'Decline'/);
  assert.match(html, /\.activity-signup\.is-selected/);
  assert.match(html, /activity-card-actions/);
  assert.match(html, /data-activity-delete="\$\{escapeHtml\(activityId\)\}"/);
  assert.match(html, /const deleteLink=variant==='detail'&&state==='declined'\?`<button class="activity-delete-link" type="button" data-activity-delete="\$\{escapeHtml\(activityId\)\}">Delete<\/button>`:''/);
  assert.match(html, /\.activity-delete-link \{[^}]*background: none[^}]*border: 0[^}]*color: rgba\(255,107,107,\.72\)[^}]*opacity: \.72[^}]*text-decoration: underline[^}]*text-decoration-color: rgba\(255,107,107,\.62\)/);
  assert.doesNotMatch(html, /activity-delete-link[^}]*border-radius/);
  assert.match(html, /activity-attendees/);
  assert.match(html, /function renderCompactCalendarEvent\(event, full\)/);
  assert.match(html, /function renderExpandedDayEvent\(event, full\)/);
  assert.match(html, /dayEvents\.map\(event=>renderCompactCalendarEvent\(event, full\)\)/);
  assert.match(html, /activityEvents\.filter\(event=>!deletedActivity\(event\.id\)\)\.forEach\(event=>eventsByDate\[event\.date\]\?\.push\(event\)\)/);
  assert.match(html, /function renderActivityStateIcon\(activityId\)/);
  assert.match(html, /activityRsvpState\(activityId\)==='signed'\?'<span class="activity-state-icon is-signed" aria-label="Signed up">✓<\/span>':/);
  assert.match(html, /activityRsvpState\(activityId\)==='declined'\?'<span class="activity-state-icon is-declined" aria-label="Declined">×<\/span>':''/);
  assert.doesNotMatch(html, /\.activity-state-icon \{[^}]*border-radius/);
  assert.doesNotMatch(html, /\.activity-state-icon\.is-declined \{[^}]*border:/);
  assert.match(html, /function renderExpandedDayEvent\(event, full\)\{ const hoverActions=renderDayViewEventActions\(event\); if\(event\.custom\)[\s\S]*return `[\s\S]*data-day-event="\$\{escapeHtml\(event\.id\|\|'\'\)\}"[\s\S]*renderActivityStateIcon\(event\.id\)[\s\S]*\$\{hoverActions\}<\/article>`; \}/);
  assert.match(html, /function renderDayEventDetail\(event, full\)/);
  assert.match(html, /id="dayEventDetail"/);
  assert.match(html, /id="dayEventDetailActions"/);
  assert.match(html, /id="dayViewNav"/);
  assert.match(html, /function setDayViewNavHidden\(hidden\)\{ dayViewNav\.hidden=hidden; \}/);
  assert.match(html, /function closeDayEventDetail\(\)\{ activeDayEventIndex=-1; dayEventShareButton\.hidden=true; dayEventShareButton\.onclick=null; dayEventDetail\.hidden=true; setDayViewNavHidden\(false\); \}/);
  assert.match(html, /function openDayEventDetail\(index\)\{ const event=activeDayViewEvents\[index\]; if\(event\)\{ activeDayEventIndex=index; setDayViewNavHidden\(true\); renderDayEventDetail\(event, activeDayViewFull\); \} \}/);
  const detailMarkup = html.slice(html.indexOf('id="dayEventDetail"'), html.indexOf('id="prepPlanner"'));
  assert.doesNotMatch(detailMarkup, /id="closeDayEventDetailButton"/);
  assert.doesNotMatch(detailMarkup, /aria-label="Close event details">×/);
  assert.match(html, /dayEventDetailActions\.innerHTML=event\.custom\?renderCustomEventActions\(event\.id\):\(event\.id\?renderActivityActions\(event\.id\):''\)/);
  assert.match(html, /dayViewTimeline\.querySelectorAll\('\[data-day-event\]'\)\.forEach/);
  const expandedEventFunction = html.slice(html.indexOf('function renderExpandedDayEvent'), html.indexOf('function renderDayEventDetail'));
  assert.doesNotMatch(expandedEventFunction, /renderActivityActions\(event\.id\)/);
  assert.doesNotMatch(html, /dayEvents\.map\(event=>`<article class="calendar-event[\s\S]*renderActivityActions\(event\.id\)/);
  assert.match(html, /is-activity \$\{activityStateClass\(event\.id\)\}/);
  assert.match(html, /\.activity-main \{[^}]*text-align: left/);
  assert.match(html, /\.calendar-event\.is-activity\.is-pending/);
  assert.match(html, /--activity-dash-size: 9px/);
  assert.match(html, /--activity-dash-gap: 6px/);
  assert.match(html, /repeating-linear-gradient\(90deg/);
  assert.match(html, /\.calendar-event\.is-activity\.is-signed/);
  assert.match(html, /border: 1px solid rgba\(255,255,255,\.66\)/);
  assert.match(html, /\.calendar-event\.is-activity\.is-declined/);
  assert.match(html, /opacity: \.58/);
  assert.match(html, /function activityDisplayTitle\(event\)/);
  assert.match(html, /event\.id && !event\.custom && activityRsvpState\(event\.id\)==='declined' \? `DECLINED: \$\{event\.title\}` : event\.title/);
  assert.match(html, /\.calendar-event\.is-activity\.is-declined strong/);
  assert.match(html, /text-decoration: line-through/);
  assert.match(html, /Sign up/);
  assert.match(html, /Decline/);
  assert.doesNotMatch(html, /You're in/);
  assert.match(html, /dayEventDetailActions\.querySelectorAll\('\[data-activity-signup\]'\)\.forEach/);
  assert.match(html, /dayEventDetailActions\.querySelectorAll\('\[data-activity-decline\]'\)\.forEach/);
  assert.match(html, /dayEventDetailActions\.querySelectorAll\('\[data-activity-delete\]'\)\.forEach/);
  assert.match(html, /dayViewTimeline\.querySelectorAll\('\[data-activity-signup\]'\)\.forEach/);
  assert.match(html, /dayViewTimeline\.querySelectorAll\('\[data-activity-decline\]'\)\.forEach/);
  assert.doesNotMatch(html, /calendarItems\.querySelectorAll\('\[data-activity-signup\]'\)\.forEach/);
  assert.doesNotMatch(html, /calendarItems\.querySelectorAll\('\[data-activity-decline\]'\)\.forEach/);
  assert.match(html, /dinners\.forEach\(slot=>eventsByDate\[slot\.date\]\?\.push\(\{title:'Dinner'/);
  assert.doesNotMatch(html, /Dinner placeholder/);
});

test('desktop day-view RSVP actions appear on hover beside eligible events', () => {
  assert.match(html, /function renderDayViewEventActions\(event\)/);
  assert.match(html, /event\.custom\?renderCustomEventActions\(event\.id,'day-hover'\):\(event\.id\?renderActivityActions\(event\.id,'day-hover'\):''\)/);
  assert.match(html, /class="day-view-hover-actions"/);
  assert.match(html, /\.day-view-hover-actions \{[^}]*position: absolute;[^}]*top: 50%;[^}]*right: 8px;[^}]*transform: translateY\(-50%\);[^}]*opacity: 0;[^}]*pointer-events: none;/s);
  assert.match(html, /\.day-view-event:hover > \.day-view-hover-actions, \.day-view-event:focus-within > \.day-view-hover-actions \{[^}]*opacity: 1 !important;[^}]*pointer-events: auto;/s);
  assert.match(html, /@media \(max-width: 760px\) \{[\s\S]*\.day-view-hover-actions \{ display: none; \}/);
  assert.match(html, /renderActivityActions\(activityId, variant='detail'\)/);
  assert.doesNotMatch(html, /variant==='day-hover'\?'Sign up'/);
  assert.match(html, /renderCustomEventActions\(eventId, variant='detail'\)/);
  assert.match(html, /const signupLabel=variant==='day-hover'\?\(signed\?'Signed up':\(event\?\.inviteMode==='open'\?'Sign up':'Accept'\)\):\(signed\?'Going':'Join'\)/);
  assert.match(html, /const declineLabel=variant==='day-hover'\?\(declined\?'Declined':'Decline'\):\(declined\?'Declined':'Decline'\)/);
  assert.match(html, /const signup=\(!isCreator && \(event\?\.inviteMode==='open'\|\|event\?\.inviteMode==='invite-only'\)\)/);
  assert.match(html, /dayViewTimeline\.querySelectorAll\('\[data-custom-event-signup\]'\)\.forEach/);
  assert.match(html, /dayViewTimeline\.querySelectorAll\('\[data-custom-event-decline\]'\)\.forEach/);
  assert.match(html, /function customEventStateClass\(eventId\)/);
  assert.match(html, /customEventDeclines\(\)\[eventId\]/);
  assert.match(html, /is-custom \$\{customEventStateClass\(event\.id\)\}/);
  assert.match(html, /\.day-view-event\.is-activity\.is-declined > :is\(strong, span, small\), \.day-view-event\.is-custom\.is-declined > :is\(strong, span, small\) \{[^}]*opacity: \.2;/s);
  assert.match(html, /\.day-view-event\.is-activity\.is-declined strong, \.day-view-event\.is-custom\.is-declined strong \{[^}]*text-decoration: line-through/s);
});


test('people profiles live in an animated fit-content dashboard tab control', () => {
  const tripInfoBlock = html.slice(html.indexOf('id="tripInfo"'), html.indexOf('id="dinnerPicker"'));
  assert.match(tripInfoBlock, /id="tripTabs"/);
  assert.match(tripInfoBlock, /id="tripTabIndicator"/);
  assert.match(tripInfoBlock, /id="overviewTab"/);
  assert.match(tripInfoBlock, /id="peopleTab"/);
  assert.match(html, /\.board-tab\.active \{[^}]*background: rgba\(255,255,255,\.80\);[^}]*color: var\(--ink\);/);
  assert.match(html, /function syncBoardTabIndicator\(indicator, active\)/);
  assert.match(html, /requestAnimationFrame\(\(\)=>syncTripTabIndicator\(overviewTab\)\)/);
  assert.match(html, /function openTripInfo\(\)\{[\s\S]*requestAnimationFrame\(\(\)=>syncTripTabIndicator\(overviewTab\)\)/);
  assert.match(tripInfoBlock, /id="tripTabViewport"/);
  assert.match(tripInfoBlock, /id="overviewPanel"/);
  assert.match(tripInfoBlock, /id="peoplePanel"[^>]*hidden/);
  assert.match(tripInfoBlock, /id="peopleList"/);
  assert.doesNotMatch(tripInfoBlock, /id="myPeopleCard"/);
  assert.match(html, /\.board-tabs \{[^}]*width: fit-content/);
  assert.match(html, /\.trip-tabs \{[^}]*position: absolute;[^}]*bottom: 20px;[^}]*left: 50%;[^}]*transform: translateX\(-50%\);[^}]*z-index: 6;[^}]*margin: 0;/s);
  assert.doesNotMatch(html, /#tripInfo \.dashboard-card \{[^}]*padding-bottom: 64px/s);
  assert.match(html, /\.board-tab-indicator/);
  assert.match(html, /transition: left \.24s ease, width \.24s ease/);
  assert.match(html, /@media \(max-width: 760px\) \{[\s\S]*\.trip-info-scroll \{[^}]*position: relative/);
  assert.match(html, /@media \(max-width: 760px\) \{[\s\S]*\.trip-tabs \{[^}]*position: fixed[^}]*bottom: max\(14px, calc\(env\(safe-area-inset-bottom\) \+ 14px\)\)[^}]*left: 50%[^}]*transform: translateX\(-50%\)[^}]*z-index: 30[^}]*pointer-events: auto/);
  assert.doesNotMatch(html, /transform: translate\(-50%, 25px\)/);
  assert.match(html, /@media \(max-width: 760px\) \{[\s\S]*\.trip-tab-panel \{[^}]*padding-bottom: 104px/);
  assert.doesNotMatch(html, /@media \(max-width: 760px\) \{[\s\S]*\.trip-tabs \{[^}]*margin-bottom: 10px/);
  assert.match(html, /#tripInfo \.dashboard-card \{[^}]*height: min\(88svh, 760px\)/);
  assert.match(html, /#tripInfo \.trip-info-scroll \{[^}]*display: flex/);
  assert.match(html, /#tripInfo \.trip-info-scroll \{[^}]*overflow: hidden/);
  assert.match(html, /\.trip-tab-viewport \{[^}]*flex: 1 1 auto[^}]*overflow: hidden/);
  assert.match(html, /\.trip-tab-panels \{[^}]*position: absolute[^}]*inset: 0[^}]*height: 100%[^}]*min-height: 0[^}]*overflow: hidden/);
  assert.match(html, /\.trip-tab-panel \{[^}]*height: 100%[^}]*max-height: 100%[^}]*overflow-y: auto[^}]*transition: transform \.28s ease, opacity \.22s ease/);
  assert.match(html, /\.trip-tab-panel::-webkit-scrollbar/);
  assert.match(html, /\.trip-tab-panel\.is-exiting-left/);
  assert.match(html, /\.trip-tab-panel\.is-entering-right/);
  assert.doesNotMatch(html, /grid-template-columns: 100% 100%/);
  assert.doesNotMatch(html, /width: 200%/);
  assert.match(html, /function showTripPanel\(nextPanel, direction\)/);
  assert.match(html, /currentTripTabPanel\.hidden=true/);
  assert.match(html, /nextPanel\.hidden=false/);
  assert.match(html, /setTimeout\(\(\)=>\{ currentTripTabPanel\.hidden=true/);
  assert.match(html, /function syncTripTabIndicator\(active=overviewTab\)/);
  assert.match(html, /requestAnimationFrame\(\(\)=>syncTripTabIndicator\(active\)\)/);
  assert.match(html, /setTripTab\('overview'\)/);
  assert.match(html, /setTripTab\('people'\)/);
  assert.match(html, /@media \(max-width: 760px\) \{[\s\S]*\.trip-tabs \{[^}]*position: fixed[^}]*width: fit-content/);
  assert.match(html, /@media \(max-width: 760px\) \{[\s\S]*#tripInfo \.dashboard-card \{[^}]*height: min\(680px, calc\(100svh - 44px\)\)[^}]*max-height: calc\(100svh - 44px\)/);
  assert.match(html, /@media \(max-width: 760px\) \{[\s\S]*\.board-tab-indicator \{[^}]*display: none/);
  assert.match(html, /@media \(max-width: 760px\) \{[\s\S]*\.trip-tabs \.board-tab.active \{[^}]*background: rgba\(255,255,255,\.80\)[^}]*color: var\(--ink\)/);
  assert.match(html, /\.board-tab-indicator \{[^}]*transition: left \.24s ease, width \.24s ease/);
  assert.match(html, /indicator\.style\.width=`\$\{active\.offsetWidth\}px`/);
  assert.match(html, /indicator\.style\.minWidth=`\$\{active\.offsetWidth\}px`/);
  assert.match(html, /indicator\.style\.left=`\$\{active\.offsetLeft\}px`/);
  assert.match(html, /function setTripTab\(tab\)/);
  assert.match(html, /function profileSummary\(person, board, dinner\)/);
  assert.match(html, /const ROOM_COMING_SOON='Coming soon'/);
  assert.match(html, /const roomAssignments=\{\}/);
  assert.doesNotMatch(html, /'Tanner':\{floor:'1st floor', apartment:'1st floor apartment', bed:'Queen bed', room:'Queen room', roommates:\['David'\]\}/);
  assert.doesNotMatch(html, /'Candace':\{floor:'3rd floor', apartment:'3rd floor apartment', bed:'Twin bed', room:'2-twin room', roommates:\['Erika'\]\}/);
  assert.doesNotMatch(html, /'Jacob G\.':\{floor:'2nd floor', apartment:'2nd floor apartment', bed:'Queen bed', room:'Queen room', roommates:\['Jacob M\.'\]\}/);
  assert.doesNotMatch(html, /'Amanda':\{floor:'2nd floor', apartment:'2nd floor apartment', bed:'Twin bed', room:'2-twin room', roommates:\['Kait'\]\}/);
  assert.match(html, /const phoneNumbers=\{/);
  assert.match(html, /'Mikaela':\{display:'\(816\) 590-0536', href:'\+18165900536'\}/);
  assert.match(html, /'Tanner':\{display:'\(805\) 459-8056', href:'\+18054598056'\}/);
  assert.match(html, /'Nick':\{display:'\(805\) 450-4469', href:'\+18054504469'\}/);
  assert.match(html, /function roomAssignment\(person\)/);
  assert.match(html, /function roomLine\(person\)\{ return ROOM_COMING_SOON; \}/);
  assert.match(html, /function roomSummary\(person\)\{ return ROOM_COMING_SOON; \}/);
  assert.match(html, /function phoneLine\(person\)/);
  assert.match(html, /function arrivalCountdownLine\(person, board\)/);
  assert.match(html, /Coming soon/);
  assert.doesNotMatch(html, /Room TBD/);
  assert.match(html, /Arrival TBD/);
  assert.match(html, /No dinner claimed yet\./);
  assert.match(html, /No dietary preferences added yet\./);
  assert.match(html, /id="profileSummaryLine" class="profile-arrival-line">Shared trip details\.<\/p>/);
  assert.doesNotMatch(html, /<article class="profile-detail-item"><strong>Arrival<\/strong>/);
  assert.match(html, /class="profile-detail-row"[\s\S]*<svg class="profile-detail-icon" data-symbol="phone" aria-hidden="true"[\s\S]*<span id="profilePhone">No phone added yet\.<\/span>/);
  assert.match(html, /class="profile-detail-row"[\s\S]*<svg class="profile-detail-icon" data-symbol="bed" aria-hidden="true"[\s\S]*<span id="profileRoom">Coming soon<\/span>/);
  assert.match(html, /class="profile-detail-row"[\s\S]*<svg class="profile-detail-icon" data-symbol="chef" aria-hidden="true"[\s\S]*<span id="profileDinner">No dinner claimed yet\.<\/span>/);
  assert.match(html, /class="profile-detail-row"[\s\S]*<svg class="profile-detail-icon" data-symbol="utensils" aria-hidden="true"[\s\S]*<span id="profileDietary">No dietary preferences added yet\.<\/span>/);
  assert.doesNotMatch(html, /☎|🛏|🧑‍🍳|🍽/);
  assert.doesNotMatch(html, /<strong>Phone<\/strong>|<strong>Room<\/strong>|<strong>Dinner<\/strong>|<strong>Dietary preferences<\/strong>/);
  assert.match(html, /\.profile-detail-icon \{[^}]*stroke: currentColor[^}]*fill: none/s);
  assert.doesNotMatch(html, /\.profile-detail-item \{[^}]*border:/);
  assert.doesNotMatch(html, /id="profileDeparture"/);
  assert.doesNotMatch(html, /id="profileNotes"/);
  assert.doesNotMatch(html, /function flightLine\(/);
  assert.match(html, /function renderPeopleDirectory\(\)/);
  assert.match(html, /function profileDetailRows\(person, board, dinner\)/);
  assert.match(html, /function profileIcon\(symbol\)/);
  assert.match(html, /function profilePanelId\(person\)/);
  assert.match(html, /<article class="person-card">/);
  assert.match(html, /<button class="person-card-summary" type="button" data-profile-toggle="\$\{escapeHtml\(person\)\}" aria-expanded="false" aria-controls="\$\{profilePanelId\(person\)\}">/);
  assert.match(html, /<section class="person-card-details" id="\$\{profilePanelId\(person\)\}" hidden>\$\{profileDetailRows\(person, board, dinner\)\}<\/section>/);
  assert.match(html, /peopleList\.querySelectorAll\('\[data-profile-toggle\]'\)\.forEach/);
  assert.match(html, /const expanded=btn\.getAttribute\('aria-expanded'\)==='true'/);
  assert.match(html, /btn\.setAttribute\('aria-expanded',String\(!expanded\)\)/);
  assert.match(html, /panel\.hidden=expanded/);
  assert.match(html, /\.person-card-summary \{[^}]*min-height: 38px[^}]*grid-template-columns: minmax\(0, 1fr\) auto/s);
  assert.match(html, /\.person-card-details \{[^}]*padding: 0 11px 12px/s);
  assert.doesNotMatch(html, /<span class="person-room">\$\{escapeHtml\(roomSummary\(person\)\)\}<\/span>/);
  assert.doesNotMatch(html, /<span>\$\{escapeHtml\(profileSummary\(person, board, dinner\)\)\}<\/span>/);
  assert.doesNotMatch(html, /data-profile="\$\{escapeHtml\(person\)\}"/);
  assert.doesNotMatch(html, /peopleList\.querySelectorAll\('\[data-profile\]'\)\.forEach/);
  assert.match(html, /peopleTab\.addEventListener\('click',\(\)=>setTripTab\('people'\)\)/);
  assert.doesNotMatch(html, /myPeopleCard\.addEventListener/);
});

test('mobile flight form preserves focus outline inside the scroll container', () => {
  assert.match(html, /@media \(max-width: 760px\) \{[\s\S]*form \{[^}]*padding: 7px 7px 3px[^}]*margin: -7px 0 0[^}]*overflow-x: hidden/);
  assert.match(html, /@media \(max-width: 760px\) \{[\s\S]*\.field \{[^}]*min-width: 0[^}]*padding: 3px/);
  assert.match(html, /\.pill:focus-visible, \.close:focus-visible, \.back:focus-visible, \.todo-chip:focus-visible, input:focus, select:focus, textarea:focus \{ outline: 2px solid rgba\(255,255,255,\.78\); outline-offset: 2px; \}/);
});

test('staging review mode enters the trip dashboard without magic-link signup', () => {
  assert.match(html, /const REVIEW_NAME_KEY='reviewName'/);
  assert.match(html, /const DEFAULT_STAGING_REVIEW_NAME='Tanner'/);
  assert.match(html, /function isStagingReviewHost\(hostname=window\.location\.hostname\)/);
  assert.match(html, /function stagingReviewName\(\)/);
  assert.match(html, /hostname\.includes\('vercel\.app'\)/);
  assert.match(html, /hostname\.includes\('staging\.croatia\.tannerbegin\.com'\)/);
  assert.match(html, /params\.get\(REVIEW_NAME_KEY\) \|\| DEFAULT_STAGING_REVIEW_NAME/);
  assert.match(html, /crew\.find\(name=>name\.toLowerCase\(\)===requested\.toLowerCase\(\)\)/);
  assert.doesNotMatch(html, /canonicalCrewName/);
  assert.match(html, /currentGuest=\{ name:reviewName, review:true \}/);
  assert.match(html, /fields\.name\.value=reviewName; claimNameSelect\.value=reviewName/);
  assert.match(html, /localStorage\.setItem\(NAME_KEY,reviewName\)/);
  assert.match(html, /if\(params\.has\(REVIEW_NAME_KEY\)\) history\.replaceState\(null,'',window\.location\.pathname\)/);
  assert.match(html, /Reviewing as \$\{reviewName\}/);
});
