/* Leonida Trophy Guide & Tracker — dense 3-column tracker.
   Loads app/data/trophies.json, details.json and sources.json; every audit
   number on screen is computed from that data, not typed in. */
(function () {
  'use strict';

  var STORE_KEY = 'leonida-tracker-v3';
  var PMA_ID = 'positive-mental-attitude';
  var PMA_TOTAL = 18;
  var DEMO_EARNED_COUNT = 14;
  var DEMO_PMA_COUNT = 6;

  /* 100% Completion checklist, 35 lines in 3 groups — PowerPyx,
     "GTA 6 100% Completion Checklist & Guide", read 21 Nov 2026. */
  var CHECKLIST = [
    { group: 'Story & Tasks', weight: '45%', lines: [
      'Story Completion (finish the story)',
      '100 Optional Tasks Completed',
      '39 of 39 Gang Operations Cleared',
      '22 of 22 Bank Jobs Fully Completed',
      '7 of 7 Payday Loan Jobs Fully Completed',
      '34 of 35 Smash ‘N’ Grabs Fully Completed',
      '50 of 91 Stick Ups Fully Completed',
      '$100,000 Narcotics Fenced',
      '$100,000 Jewelry Fenced',
      '$250,000 Marked Bills Fenced',
      '8 of 8 Vaults Hit',
      '$200,000 Vehicles Fenced'
    ]},
    { group: 'Exploration & Activities', weight: '45%', lines: [
      '5 of 7 Kenton Sets Completed',
      '15 of 18 Collectible Card Sets Found',
      '100 WAiNK Locations Scanned',
      '33 of 33 Underwater Discoveries Found',
      '30 of 34 Magazines, Books & Comics Found (includes 27 Magazines and 7 Book Swaps)',
      '15 of 18 Meditation Spots Completed',
      '100 of 125 Cocaine Flamingos Destroyed',
      '2 of 2 Unique Playlists Completed',
      '70 of 79 Discovered Styles',
      '30 of 40 Unique Races Won',
      '10 of 13 Race Challenge Gold Medals',
      '42 of 42 Shooting Range Gold Medals',
      '4 of 4 Video Games Played',
      '5 of 7 Pool Opponents Defeated',
      '2 of 3 Mini Golf Locations Played',
      '90 of 100 Basketball Hoops',
      '42 of 42 Drone Time Trials Completed',
      '300 of 397 Stunts Completed (130 Stunt Jumps, 202 Under the Bridges, 40 Knife Flights, 25 Base Jumps)',
      '70 of 80 Challenges Completed',
      '15 of 15 Bret’s Target Decks'
    ]},
    { group: 'Discovery', weight: '10%', lines: [
      '200 of 277 Base Model Vehicles scanned',
      '50 of 66 Standard Issue Weapons found (53 Guns, 9 Melee, 4 Explosives)',
      '100 of 255 Animals studied'
    ]}
  ];

  /* Guide-level disputes (the whole guide disagrees, not one trophy).
     Sourced from the 28 pages read 21 Nov 2026. */
  var GUIDE_DISPUTES = [
    { q: 'How many story missions are there — 91, 93, 95 or 122?',
      a: 'KeenGamer counts 91 story missions.',
      b: 'Insider Gaming and Push Square count 93; VGC counts 95; GTABay counts 122 including optional missions.',
      call: 'The count depends on what you count — the prologue and optional missions move the number. The trophy list itself (55 trophies) is the same on every list.' },
    { q: 'Platinum hours — about 200, or up to 300?',
      a: 'PowerPyx, KeenGamer, GTABase and OutputLag put the Platinum at about 200 hours.',
      b: 'Push Square says “up to 300 hours or more” — and marks its guide work in progress.',
      call: 'Plan for ~200 hours; 300 is the work-in-progress upper bound, not the measured figure.' },
    { q: 'Meditations — 15 or 18?',
      a: 'The 100% checklist needs 15 of 18 meditation spots (PowerPyx 100% guide).',
      b: 'The Positive Mental Attitude trophy needs all 18 meditations (Beebom, GameTrek).',
      call: 'Do all 18. The trophy is the stricter requirement, and the checklist line is covered on the way.' }
  ];

  var state = {
    trophies: [], meta: null, detailsById: {}, sources: [], sourcesMeta: null,
    roadmap: [], earned: {}, pmaCount: 0, demo: false, spoilersShown: false,
    query: '', filterKey: '', selectedId: PMA_ID, tab: 'tracker'
  };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function gradeLabel(g) { return g.charAt(0).toUpperCase() + g.slice(1); }
  function catLabel(c) { return c.charAt(0).toUpperCase() + c.slice(1); }
  function trophyById(id) { return state.trophies.find(function (t) { return t.id === id; }); }
  function detailsFor(id) { return state.detailsById[id] || { steps: [], disputes: [], sources: [] }; }
  function roadmapPos(id) { return state.roadmap.findIndex(function (t) { return t.id === id; }) + 1; }
  function stageName(n) {
    var s = (state.meta && state.meta.stages || []).find(function (x) { return x.n === n; });
    return s ? 'Stage ' + n + ' — ' + s.name : 'Stage ' + n;
  }
  function sourceByN(n) { return state.sources.find(function (s) { return s.n === n; }); }
  function cite(n) {
    var s = sourceByN(n);
    var title = s ? esc(s.site + ' — ' + s.title) : '';
    return '<sup class="cite" title="' + title + '">[' + n + ']</sup>';
  }
  function cites(nums) { return (nums || []).map(cite).join(' '); }

  function loadStored() {
    var stored = null;
    try { stored = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { stored = null; }
    if (stored && stored.earned) {
      state.earned = stored.earned || {};
      state.pmaCount = stored.pma || 0;
      state.demo = !!stored.demo;
      state.spoilersShown = !!stored.spoilers;
      return;
    }
    /* Demo seed on first load: the first 14 bronze trophies in roadmap
       order (14 × 15 pts = 210 pts, 25%), PMA counter at 6/18. */
    state.roadmap.filter(function (t) { return t.grade === 'bronze'; }).slice(0, DEMO_EARNED_COUNT)
      .forEach(function (t) { state.earned[t.id] = true; });
    state.pmaCount = DEMO_PMA_COUNT;
    state.demo = true;
    saveStored();
  }
  function saveStored() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        earned: state.earned, pma: state.pmaCount, demo: state.demo, spoilers: state.spoilersShown
      }));
    } catch (e) { /* storage blocked: progress just won't persist */ }
  }

  /* ---------- audit strip (computed from data) ---------- */
  function renderAudit() {
    var counts = state.meta.counts;
    var totalSteps = 0, citedSteps = 0, backedSteps = 0, backedGuides = 0, disputes = 0;
    var watch = 0, unconfirmed = 0, missable = 0;
    state.trophies.forEach(function (t) {
      var d = detailsFor(t.id);
      totalSteps += d.steps.length;
      d.steps.forEach(function (s) {
        if (s.src && s.src.length) citedSteps++;
        if (s.src && s.src.length >= 2) backedSteps++;
      });
      if (d.steps.some(function (s) { return s.src && s.src.length >= 2; })) backedGuides++;
      disputes += d.disputes.length;
      if (d.watch) watch++;
      if (d.unconfirmed) unconfirmed++;
      if (t.missable) missable++;
    });
    var g = counts;
    $('audit-line-1').innerHTML =
      '<strong>' + g.total + '/' + g.total + '</strong> official name, description, grade &middot; ' +
      '<strong>' + g.platinum + 'P ' + g.gold + 'G ' + g.silver + 'S ' + g.bronze + 'B</strong> &middot; ' +
      '<strong>' + g.psn_points_total.toLocaleString('en-US') + '</strong> PSN points &middot; ' +
      '<strong>' + citedSteps + '/' + totalSteps + ' steps cited</strong> &middot; ' +
      '<strong>' + backedSteps + ' steps backed by 2+ sources</strong> &middot; ' +
      '<strong>' + backedGuides + '/' + g.total + ' guides backed by 2+ sources</strong>';
    $('audit-line-2').textContent =
      (state.sourcesMeta.pages || '') + ' pages · ' + (state.sourcesMeta.sites || '') + ' sites read ' +
      (state.sourcesMeta.read || '') + ' · ' + counts.hidden_reported + ' PSN-hidden (' +
      counts.hidden_identified + ' identified) · ' + missable + ' possibly missable · ' + watch +
      ' watch · ' + unconfirmed + ' unconfirmed · ' + disputes +
      ' disputes shown both ways · ~200 h · difficulty 4/10 · one playthrough · game launched 19 Nov 2026';
  }

  /* ---------- progress ---------- */
  function earnedList() { return state.trophies.filter(function (t) { return state.earned[t.id]; }); }
  function updateProgress() {
    var list = earnedList();
    var points = list.reduce(function (s, t) { return s + t.psn_points; }, 0);
    var total = state.trophies.length;
    var pct = total ? Math.round(list.length / total * 100) : 0;
    $('earned-count').textContent = list.length;
    $('earned-points').textContent = points;
    $('progress-pct').textContent = pct + '%';
    $('bar-fill').style.width = pct + '%';
    $('goal-count').textContent = list.length + ' / ' + total;
    $('goal-points').textContent = points + ' / 1,350';
    $('goal-bar').style.width = pct + '%';
    $('demo-label').hidden = !state.demo;
  }

  /* ---------- filter chips (16) ---------- */
  function chipDefs() {
    var c = state.meta.counts;
    var defs = [
      { key: '', label: 'All', n: c.total, aria: 'Show all trophies' },
      { key: 'grade:platinum', label: 'Platinum', n: c.platinum, aria: 'Filter by grade: Platinum' },
      { key: 'grade:gold', label: 'Gold', n: c.gold, aria: 'Filter by grade: Gold' },
      { key: 'grade:silver', label: 'Silver', n: c.silver, aria: 'Filter by grade: Silver' },
      { key: 'grade:bronze', label: 'Bronze', n: c.bronze, aria: 'Filter by grade: Bronze' }
    ];
    ['story', 'collectibles', 'activities', 'crime', 'strangers', 'misc', 'platinum'].forEach(function (cat) {
      var n = state.trophies.filter(function (t) { return t.category === cat; }).length;
      defs.push({ key: 'category:' + cat, label: catLabel(cat), n: n, aria: 'Filter by category: ' + catLabel(cat) });
    });
    var earnedN = earnedList().length;
    defs.push(
      { key: 'status:earned', label: 'Earned', n: earnedN, aria: 'Show earned trophies' },
      { key: 'status:remaining', label: 'Remaining', n: c.total - earnedN, aria: 'Show trophies still to earn' },
      { key: 'status:missable', label: 'Missable', n: state.trophies.filter(function (t) { return t.missable; }).length, aria: 'Show possibly missable trophies' },
      { key: 'status:disputed', label: 'Disputed', n: state.trophies.filter(function (t) { return detailsFor(t.id).disputes.length; }).length, aria: 'Show trophies where sources disagree' }
    );
    return defs;
  }
  function renderChips() {
    $('chips').innerHTML = chipDefs().map(function (d) {
      return '<button type="button" class="chip-btn' + (state.filterKey === d.key ? ' active' : '') +
        '" data-chip="' + esc(d.key) + '" aria-label="' + esc(d.aria) + '">' + esc(d.label) +
        ' <span class="n">' + d.n + '</span></button>';
    }).join('');
  }
  function matchesFilter(t) {
    if (!state.filterKey) return true;
    var parts = state.filterKey.split(':');
    var kind = parts[0], val = parts[1];
    if (kind === 'grade') return t.grade === val;
    if (kind === 'category') return t.category === val;
    if (kind === 'status' && val === 'earned') return !!state.earned[t.id];
    if (kind === 'status' && val === 'remaining') return !state.earned[t.id];
    if (kind === 'status' && val === 'missable') return !!t.missable;
    if (kind === 'status' && val === 'disputed') return detailsFor(t.id).disputes.length > 0;
    return true;
  }
  function matches(t) {
    if (!matchesFilter(t)) return false;
    if (state.query) {
      var hay = (t.name + ' ' + t.official + ' ' + t.guide + ' ' + t.category).toLowerCase();
      if (hay.indexOf(state.query) === -1) return false;
    }
    return true;
  }

  /* ---------- checklist (left column) ---------- */
  function tagsFor(t) {
    var d = detailsFor(t.id);
    var out = '';
    if (t.hidden) out += '<span class="tag tag-hidden">HIDDEN</span>';
    if (t.missable) out += '<span class="tag tag-missable">MISSABLE</span>';
    if (d.disputes.length) out += '<span class="tag tag-disputed">DISPUTED · ' + d.disputes.length + '</span>';
    if (d.watch) out += '<span class="tag tag-watch">WATCH</span>';
    if (state.earned[t.id]) out += '<span class="tag tag-earned">EARNED</span>';
    return out;
  }
  function renderList() {
    var list = state.roadmap.filter(matches);
    $('count-line').textContent = 'Showing ' + list.length + ' of ' + state.trophies.length + ' trophies.';
    if (!list.length) {
      $('trophy-list').innerHTML = '<p class="empty">No trophies match these filters. Clear the search or pick another chip.</p>';
      return;
    }
    var byStage = {};
    list.forEach(function (t) { (byStage[t.stage] = byStage[t.stage] || []).push(t); });
    $('trophy-list').innerHTML = Object.keys(byStage).sort(function (a, b) { return a - b; }).map(function (sn) {
      var group = byStage[sn];
      var done = group.filter(function (t) { return state.earned[t.id]; }).length;
      return '<div class="stage-group"><h3>' + esc(stageName(Number(sn))) + ' &middot; ' + done + '/' + group.length + ' earned</h3>' +
        group.map(function (t) {
          var d = detailsFor(t.id);
          return '<button type="button" class="trow' + (t.id === state.selectedId ? ' selected' : '') + (state.earned[t.id] ? ' earned-row' : '') +
            '" data-select="' + esc(t.id) + '">' +
            '<input type="checkbox" data-check="' + esc(t.id) + '"' + (state.earned[t.id] ? ' checked' : '') +
            ' aria-label="Mark ' + esc(t.name) + ' earned">' +
            '<span><span class="tname">' + esc(t.name) + '</span>' +
            '<span class="tmeta">' + roadmapPos(t.id) + '/55 &middot; ' + esc(gradeLabel(t.grade)) + ' &middot; ' +
            t.psn_points + ' pts &middot; ' + d.sources.length + ' sources</span>' +
            '<span class="tmeta">' + tagsFor(t) + '</span></span></button>';
        }).join('') + '</div>';
    }).join('');
  }

  /* ---------- detail (centre column) ---------- */
  function renderDetail() {
    var t = trophyById(state.selectedId) || state.roadmap[0];
    if (!t) { $('detail').innerHTML = '<p class="empty">No trophy selected.</p>'; return; }
    var d = detailsFor(t.id);
    var masked = t.spoiler && !state.spoilersShown;
    var badges = '';
    if (t.missable) badges += '<span class="badge badge-missable">POSSIBLY MISSABLE</span>';
    if (d.disputes.length) badges += '<span class="badge badge-differ">SOURCES DIFFER · ' + d.disputes.length + '</span>';
    if (t.hidden) badges += '<span class="badge badge-hidden">HIDDEN</span>';
    if (d.unconfirmed) badges += '<span class="badge badge-unconfirmed">METHOD UNCONFIRMED</span>';
    if (d.watch) badges += '<span class="badge badge-watch">WATCH</span>';
    if (state.earned[t.id]) badges += '<span class="badge badge-earned">EARNED</span>';
    var body = masked
      ? '<p class="spoiler-note">Story spoiler — hidden. Use the “Spoilers” button to reveal.</p>'
      : '<p class="official">&ldquo;' + esc(t.official) + '&rdquo;</p>' +
        '<p class="guide">' + esc(t.guide) + '</p>';
    var steps = d.steps.length
      ? '<ol class="steps">' + d.steps.map(function (s) {
          return '<li>' + esc(s.text) + ' ' + cites(s.src) + '</li>';
        }).join('') + '</ol>'
      : '';
    var disputes = d.disputes.map(function (dp) {
      return '<div class="dispute"><h4>SOURCES DIFFER — ' + esc(dp.q) + '</h4>' +
        '<p><span class="va">Version A:</span> ' + esc(dp.a) + ' ' + cites(dp.sources) + '</p>' +
        '<p><span class="vb">Version B:</span> ' + esc(dp.b) + ' ' + cites(dp.sources) + '</p>' +
        '<p><strong>Our call:</strong> ' + esc(dp.call.replace(/^Our call:\s*/i, '')) + '</p></div>';
    }).join('');
    var watchBox = d.watch
      ? '<div class="watch-box"><strong>Watch:</strong> this trophy is flagged — ' +
        (t.missable ? 'possibly missable, ' : '') +
        (d.disputes.length ? 'sources disagree, ' : '') +
        (d.unconfirmed ? 'method unconfirmed, ' : '') +
        'check the steps and disputes above before you commit to a route.</div>'
      : '';
    var stepper = '';
    if (t.id === PMA_ID) {
      stepper = '<div class="stepper"><b>YOUR COUNT ' + state.pmaCount + '/' + PMA_TOTAL + ' meditations</b>' +
        '<button type="button" id="pma-minus" aria-label="One fewer meditation">−</button>' +
        '<button type="button" id="pma-plus" aria-label="One more meditation">+</button>' +
        '<span>Track under Progress &gt; Collections &gt; Exploration &gt; Meditations. The trophy needs all 18; the 100% checklist needs 15 of 18.</span></div>';
    }
    var method = t.method_status === 'confirmed'
      ? '<span class="flag-confirmed">method confirmed</span>'
      : '<span class="flag-unconfirmed">method unconfirmed</span>';
    $('detail').innerHTML =
      '<p class="pos">Trophy ' + roadmapPos(t.id) + '/55 &middot; ' + esc(stageName(t.stage)) + ' &middot; ' + esc(catLabel(t.category)) + '</p>' +
      '<div class="detail-top"><h2>' + esc(t.name) + '</h2>' +
      '<span class="grade grade-' + esc(t.grade) + '">' + esc(gradeLabel(t.grade)) + ' · ' + t.psn_points + ' pts</span></div>' +
      '<div class="badges">' + badges + '</div>' +
      '<div class="' + (masked ? 'spoiler-hidden' : '') + '">' + body + steps + '</div>' +
      disputes + watchBox + stepper +
      '<div class="detail-foot"><span>Source: ' + esc(t.source) + ', ' + esc(t.source_date) + ' &middot; ' +
      d.sources.length + ' sources for this trophy</span>' + method +
      '<label class="check"><input type="checkbox" data-check="' + esc(t.id) + '"' + (state.earned[t.id] ? ' checked' : '') + '> Earned</label></div>';
    var minus = $('pma-minus'), plus = $('pma-plus');
    if (minus) minus.addEventListener('click', function () { setPma(state.pmaCount - 1); });
    if (plus) plus.addEventListener('click', function () { setPma(state.pmaCount + 1); });
  }
  function setPma(n) {
    state.pmaCount = Math.max(0, Math.min(PMA_TOTAL, n));
    saveStored();
    renderDetail();
  }

  /* ---------- right rail ---------- */
  function renderRail() {
    var next = state.roadmap.filter(function (t) { return !state.earned[t.id]; }).slice(0, 5);
    $('nextup').innerHTML = next.length
      ? next.map(function (t, i) {
          return '<li><button type="button" data-select="' + esc(t.id) + '">' + (i + 1) + '. ' + esc(t.name) + '</button>' +
            '<span class="nu-stage">' + esc(stageName(t.stage)) + ' &middot; ' + esc(gradeLabel(t.grade)) + ' &middot; ' + t.psn_points + ' pts</span></li>';
        }).join('')
      : '<li>All 55 earned — Vice Got a Price! is yours.</li>';
    var t = trophyById(state.selectedId) || state.roadmap[0];
    var d = t ? detailsFor(t.id) : { sources: [] };
    $('trophy-sources').innerHTML = (d.sources || []).map(function (n) {
      var s = sourceByN(n);
      if (!s) return '<li>[' + n + ']</li>';
      return '<li><span class="src-site">[' + s.n + '] ' + esc(s.site) + '</span> — ' + esc(s.title) +
        ' <span class="src-date">(' + esc(s.date) + ')</span></li>';
    }).join('') || '<li>No sources listed for this trophy.</li>';
  }

  /* ---------- roadmap tab ---------- */
  function renderRoadmap() {
    var stages = (state.meta && state.meta.stages) || [];
    $('stages').innerHTML = stages.map(function (s) {
      var group = state.trophies.filter(function (t) { return t.stage === s.n; });
      var done = group.filter(function (t) { return state.earned[t.id]; }).length;
      return '<li><span class="stage-meta">STAGE ' + s.n + ' &middot; ' + group.length + ' trophies &middot; ' + done + ' earned &middot; ' + esc(s.hours || '') + '</span>' +
        '<b>' + esc(s.name) + '</b><p>' + esc(s.tip) + '</p></li>';
    }).join('');
    var px = state.sources.find(function (s) { return /powerpyx/i.test(s.site); });
    $('checklist-cite').textContent = px ? '[' + px.n + ']' : '';
    $('checklist').innerHTML = CHECKLIST.map(function (g) {
      return '<div class="check-group"><h3>' + esc(g.group) + ' — ' + g.lines.length + ' lines (' + esc(g.weight) + ')</h3><ul>' +
        g.lines.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul></div>';
    }).join('');
  }

  /* ---------- missables tab ---------- */
  function renderMissables() {
    var watch = state.trophies.filter(function (t) { return detailsFor(t.id).watch; });
    $('watch-list').innerHTML = watch.map(function (t) {
      var d = detailsFor(t.id);
      var why = [];
      if (t.missable) why.push('possibly missable');
      if (d.disputes.length) why.push('sources disagree (' + d.disputes.length + ')');
      if (d.unconfirmed) why.push('method unconfirmed');
      return '<button type="button" class="watch-item" data-select="' + esc(t.id) + '" data-goto-tab="tracker">' +
        '<b>' + esc(t.name) + '</b><span>' + roadmapPos(t.id) + '/55 &middot; ' + esc(gradeLabel(t.grade)) +
        ' &middot; ' + why.join(' · ') + '</span></button>';
    }).join('');
  }

  /* ---------- sources tab ---------- */
  function renderSources() {
    $('guide-disputes').innerHTML = GUIDE_DISPUTES.map(function (g) {
      return '<div class="guide-dispute"><h4>' + esc(g.q) + '</h4>' +
        '<p><strong>Version A:</strong> ' + esc(g.a) + '</p>' +
        '<p><strong>Version B:</strong> ' + esc(g.b) + '</p>' +
        '<p><strong>Our call:</strong> ' + esc(g.call) + '</p></div>';
    }).join('');
    var listCheck = state.sources.filter(function (s) { return s.role === 'list-check'; });
    $('sources-intro').textContent =
      state.sources.length + ' pages · ' + (state.sourcesMeta.sites || '') + ' sites · read ' +
      (state.sourcesMeta.read || '') + '. List-check sources (full-list verification only, never cited by a step): ' +
      listCheck.map(function (s) { return s.site; }).join(', ') + '.';
    $('source-list').innerHTML = state.sources.slice().sort(function (a, b) { return a.n - b.n; }).map(function (s) {
      var citedBy = state.trophies.filter(function (t) { return detailsFor(t.id).sources.indexOf(s.n) !== -1; }).length;
      var role = s.role === 'list-check' ? 'LIST-CHECK' : 'GUIDE';
      return '<li><span class="src-site">[' + s.n + '] ' + esc(s.site) + '</span> — ' + esc(s.title) +
        ' <span class="src-role">' + role + '</span><br>' +
        '<span class="src-cited">Cited by ' + citedBy + ' of 55 guides &middot; ' + esc(s.date) + '</span><br>' +
        '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.url) + '</a></li>';
    }).join('');
  }

  /* ---------- tabs ---------- */
  function setTab(tab) {
    state.tab = tab;
    ['tracker', 'roadmap', 'missables', 'sources'].forEach(function (name) {
      $('view-' + name).hidden = name !== tab;
      var btn = $('tab-' + name);
      btn.classList.toggle('active', name === tab);
      btn.setAttribute('aria-pressed', String(name === tab));
    });
  }

  function renderAll() {
    renderAudit();
    renderChips();
    renderList();
    renderDetail();
    renderRail();
    renderRoadmap();
    renderMissables();
    renderSources();
    updateProgress();
    syncSpoilerButton();
  }

  function syncSpoilerButton() {
    var b = $('toggle-spoiler');
    b.textContent = state.spoilersShown ? 'Spoilers: shown' : 'Spoilers: hidden';
    b.setAttribute('aria-pressed', String(state.spoilersShown));
  }

  function selectTrophy(id, gotoTab) {
    if (!trophyById(id)) return;
    state.selectedId = id;
    if (gotoTab) setTab(gotoTab);
    renderList();
    renderDetail();
    renderRail();
  }

  function readUrlParams() {
    var p = new URLSearchParams(window.location.search);
    if (p.get('tab') && ['tracker', 'roadmap', 'missables', 'sources'].indexOf(p.get('tab')) !== -1) state.tab = p.get('tab');
    if (p.get('t') && trophyById(p.get('t'))) state.selectedId = p.get('t');
    if (p.get('grade')) state.filterKey = 'grade:' + p.get('grade');
    if (p.get('q')) { state.query = p.get('q').toLowerCase(); $('search').value = p.get('q'); }
    if (p.get('spoilers') === 'show') state.spoilersShown = true;
  }

  function bindEvents() {
    $('search').addEventListener('input', function (e) { state.query = e.target.value.trim().toLowerCase(); renderList(); });
    $('chips').addEventListener('click', function (e) {
      var b = e.target.closest('[data-chip]');
      if (!b) return;
      var key = b.getAttribute('data-chip');
      state.filterKey = (state.filterKey === key) ? '' : key;
      renderChips();
      renderList();
    });
    $('trophy-list').addEventListener('click', function (e) {
      var row = e.target.closest('[data-select]');
      if (!row) return;
      if (e.target.getAttribute && e.target.getAttribute('data-check')) return; /* checkbox handled below */
      selectTrophy(row.getAttribute('data-select'));
    });
    document.addEventListener('change', function (e) {
      var id = e.target.getAttribute && e.target.getAttribute('data-check');
      if (!id) return;
      if (e.target.checked) { state.earned[id] = true; state.demo = false; }
      else delete state.earned[id];
      saveStored();
      renderAll();
    });
    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-select]');
      if (el && el.tagName === 'BUTTON' && el.classList.contains('watch-item')) return; /* handled below */
      if (el && (el.closest('.nextup'))) { selectTrophy(el.getAttribute('data-select')); }
    });
    $('watch-list').addEventListener('click', function (e) {
      var el = e.target.closest('[data-select]');
      if (!el) return;
      selectTrophy(el.getAttribute('data-select'), 'tracker');
    });
    document.querySelectorAll('.tab').forEach(function (btn) {
      btn.addEventListener('click', function () { setTab(btn.getAttribute('data-tab')); });
    });
    $('toggle-spoiler').addEventListener('click', function () {
      state.spoilersShown = !state.spoilersShown;
      saveStored();
      syncSpoilerButton();
      renderDetail();
    });
    $('reset-btn').addEventListener('click', function () {
      if (!window.confirm('Clear all earned ticks?')) return;
      state.earned = {};
      state.pmaCount = 0;
      state.demo = false;
      saveStored();
      renderAll();
    });
    $('export-btn').addEventListener('click', function () {
      var blob = new Blob([JSON.stringify({ exported: new Date().toISOString(), earned: Object.keys(state.earned), pmaCount: state.pmaCount }, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'leonida-tracker-progress.json';
      a.click();
      URL.revokeObjectURL(a.href);
    });
    $('import-btn').addEventListener('click', function () { $('import-file').click(); });
    $('import-file').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(reader.result);
          var ids = Array.isArray(data) ? data : data.earned;
          var next = {};
          ids.forEach(function (id) { next[id] = true; });
          state.earned = next;
          if (data.pmaCount != null) state.pmaCount = data.pmaCount;
          state.demo = false;
          saveStored();
          renderAll();
        } catch (err) { window.alert('That file is not valid tracker JSON.'); }
      };
      reader.readAsText(f);
      e.target.value = '';
    });
  }

  Promise.all([
    fetch('data/trophies.json').then(function (r) { if (!r.ok) throw new Error('trophies.json failed: ' + r.status); return r.json(); }),
    fetch('data/details.json').then(function (r) { if (!r.ok) throw new Error('details.json failed: ' + r.status); return r.json(); }),
    fetch('data/sources.json').then(function (r) { if (!r.ok) throw new Error('sources.json failed: ' + r.status); return r.json(); })
  ]).then(function (results) {
    var trophiesDoc = results[0], detailsDoc = results[1], sourcesDoc = results[2];
    state.meta = trophiesDoc.meta;
    state.trophies = trophiesDoc.trophies;
    state.sources = sourcesDoc.sources;
    state.sourcesMeta = sourcesDoc.meta;
    detailsDoc.details.forEach(function (d) { state.detailsById[d.id] = d; });
    /* Roadmap order: stage, then file order — the Platinum sorts last. */
    state.roadmap = state.trophies.slice().sort(function (a, b) {
      if ((a.grade === 'platinum') !== (b.grade === 'platinum')) return a.grade === 'platinum' ? 1 : -1;
      if (a.stage !== b.stage) return a.stage - b.stage;
      return state.trophies.indexOf(a) - state.trophies.indexOf(b);
    });
    loadStored();
    readUrlParams();
    setTab(state.tab);
    renderAll();
    bindEvents();
  }).catch(function (err) {
    $('detail').innerHTML = '<p class="empty">Could not load the trophy data (' + esc(err.message) + '). Serve app/ over HTTP and try again.</p>';
    $('audit-line-1').textContent = 'Could not load the trophy data.';
  });
})();
