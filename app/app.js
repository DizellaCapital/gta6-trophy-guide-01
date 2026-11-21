/* Leonida Trophy Guide & Tracker — dense 3-column tracker.
   Renders app/data/trophies.json + details.json + sources.json, keeps earned ticks
   and the meditation count in localStorage, and filters without any network calls.
   Filters compare category and grade SLUGS (t.category / t.grade), never display
   names — the old chip bug compared display names and silently dropped trophies. */
(function () {
  'use strict';

  var STORE_KEY = 'leonida-tracker-v3';
  var DEMO_KEY = 'leonida-tracker-v3-demo';
  var COUNT_KEY = 'leonida-tracker-v3-counts';

  var STAGE_NAMES = {
    1: 'Story: chapters',
    2: 'Story: named missions',
    3: 'Strangers & side strands',
    4: 'Crime & robberies',
    5: 'Activities & races',
    6: 'Collectibles & exploration',
    7: 'Money, misc & Platinum',
  };
  var CATEGORY_LABELS = {
    story: 'Story', collectibles: 'Collectibles', activities: 'Activities',
    crime: 'Crime', strangers: 'Strangers', misc: 'Misc', platinum: 'Platinum',
  };
  var GRADE_LABELS = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };

  // The 14 bronze trophies the demo seed marks earned on first load (210 pts, 25%).
  var DEMO_EARNED = [
    'just-like-paradise', 'paradise-lost', 'tits-ass-drug-money', 'vice-city-baby',
    'top-of-the-world-ma', 'trust', 'break-the-bank', 'family-matters',
    'dwnfall', 'hi-jacked', 'snow-storm',
    'baited-my-tackle', 'road-to-rehabilitation', 'this-was-no-boat-accident',
  ];
  var DEMO_PMA_COUNT = 6;

  // One-line watch notes for the 9 watch-flagged trophies.
  var WATCH_TEXT = {
    'positive-mental-attitude': 'Possibly missable: do the Chapter 1 balcony meditation with Lucia before leaving Chapter 1, and keep a Chapter 1 save until the trophy pops.',
    'gunslinger': 'Police, soldiers and civilians do NOT count — pick a gang shootout at an illegal operation.',
    'catch-me-if-you-can': 'Only large planes at gates E3/E4 count, and the trophy is delayed until you fly about 1 km away.',
    'strangers-and-freaks': 'Sources disagree on which strands count — check the in-game strand counter after each strand you finish.',
    'lets-go-bowling': 'You do not need all 3 valuables in one visit; the operation respawns, and the trophy pops after escaping the police.',
    'in-the-beginning': 'Method unconfirmed — a single source only. Do not trust a single-source method for this trophy.',
    'capital-offense': 'Method unconfirmed — a single source only. Do not trust a single-source method for this trophy.',
    'bad-luck-i-guess': 'Method unconfirmed — a single source only. Do not trust a single-source method for this trophy.',
    'the-truth-is-out-there': 'Method unconfirmed — no source has confirmed a trigger yet. Leave this one for last.',
  };

  // The 35-line 100% checklist (PowerPyx 100% guide + Push Square 100% checklist).
  var CHECKLIST_100 = {
    story: [
      'Finish the story — all 91 missions (50% of the checklist)',
      '100 optional tasks',
      '39 gang operations',
      '22 bank jobs',
      '7 payday loan jobs',
      "34 of 35 smash 'n' grabs",
      '50 of 91 stick ups',
      '$100,000 narcotics fenced',
      '$100,000 jewelry fenced',
      '$250,000 marked bills fenced',
      '8 bank vaults',
      '$200,000 vehicles fenced',
    ],
    activities: [
      '5 of 7 Kenton sets',
      '15 of 18 collectible card sets',
      '100 WAiNK scans',
      '33 underwater discoveries',
      '30 of 34 magazines / books / comics',
      '15 of 18 meditations',
      '100 of 125 flamingos',
      '2 playlists',
      '70 of 79 styles',
      '30 of 40 races won',
      '10 of 13 race challenge gold medals',
      '42 shooting-range gold medals',
      '4 video games played',
      '5 of 7 pool opponents beaten',
      '2 of 3 mini golf courses',
      '90 of 100 basketball hoops',
      '42 drone time trials',
      '300 of 397 stunts',
      '70 of 80 challenges',
      "15 of 15 Bret's target decks",
    ],
    discovery: [
      '200 of 277 base-model vehicles scanned',
      '50 of 66 standard-issue weapons found',
      '100 of 255 animals studied',
    ],
  };

  var state = {
    trophies: [], details: {}, sources: [],
    earned: {}, counts: {}, demo: false,
    spoilersShown: false,
    query: '', filter: { type: 'all' },
    selectedId: 'positive-mental-attitude',
    tab: 'tracker',
  };

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function loadJSON(path) {
    return fetch(path).then(function (r) {
      if (!r.ok) throw new Error('failed to load ' + path);
      return r.json();
    });
  }

  function loadStore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      state.earned = raw ? JSON.parse(raw) : {};
      var counts = localStorage.getItem(COUNT_KEY);
      state.counts = counts ? JSON.parse(counts) : {};
      state.demo = localStorage.getItem(DEMO_KEY) === '1';
    } catch (e) { state.earned = {}; state.counts = {}; state.demo = false; }
    if (!state.demo && Object.keys(state.earned).length === 0) {
      // First load: demo seed — 14 bronze trophies earned, PMA count 6/18.
      DEMO_EARNED.forEach(function (id) { state.earned[id] = true; });
      state.counts['positive-mental-attitude'] = DEMO_PMA_COUNT;
      state.demo = true;
      saveStore();
    }
  }

  function saveStore() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state.earned));
      localStorage.setItem(COUNT_KEY, JSON.stringify(state.counts));
      localStorage.setItem(DEMO_KEY, state.demo ? '1' : '0');
    } catch (e) { /* storage blocked: progress just won't persist */ }
  }

  // Roadmap order: stage, then file order, platinum pinned last.
  function roadmapOrder() {
    return state.trophies.slice().sort(function (a, b) {
      if (a.grade === 'platinum' && b.grade !== 'platinum') return 1;
      if (b.grade === 'platinum' && a.grade !== 'platinum') return -1;
      if (a.stage !== b.stage) return a.stage - b.stage;
      return state.trophies.indexOf(a) - state.trophies.indexOf(b);
    });
  }

  function roadmapPosition(id) {
    var order = roadmapOrder();
    for (var i = 0; i < order.length; i++) if (order[i].id === id) return i + 1;
    return null;
  }

  function trophyById(id) {
    for (var i = 0; i < state.trophies.length; i++) if (state.trophies[i].id === id) return state.trophies[i];
    return null;
  }

  function detailsFor(id) { return state.details[id] || { steps: [], disputes: [], sources: [] }; }

  function sourceByNum(n) {
    for (var i = 0; i < state.sources.length; i++) if (state.sources[i].n === n) return state.sources[i];
    return null;
  }

  function citedByCount(n) {
    var count = 0;
    state.trophies.forEach(function (t) {
      var d = detailsFor(t.id);
      if ((d.sources || []).indexOf(n) !== -1) count += 1;
    });
    return count;
  }

  function matches(t) {
    var f = state.filter;
    if (f.type === 'category' && t.category !== f.value) return false;
    if (f.type === 'grade' && t.grade !== f.value) return false;
    if (f.type === 'earned' && !state.earned[t.id]) return false;
    if (f.type === 'remaining' && state.earned[t.id]) return false;
    if (f.type === 'missable' && !t.missable) return false;
    if (f.type === 'unconfirmed' && t.method_status === 'confirmed') return false;
    if (state.query) {
      var hay = (t.name + ' ' + t.official + ' ' + t.guide + ' ' + t.category).toLowerCase();
      if (hay.indexOf(state.query) === -1) return false;
    }
    return true;
  }

  function tagsFor(t) {
    var d = detailsFor(t.id);
    var tags = [];
    if (t.hidden) tags.push(['tag-hidden', 'Hidden']);
    if (t.missable) tags.push(['tag-missable', 'Missable']);
    if (d.disputes && d.disputes.length) tags.push(['tag-disputed', 'Disputed']);
    if (d.watch) tags.push(['tag-watch', 'Watch']);
    if (t.method_status !== 'confirmed') tags.push(['tag-unconfirmed', 'Unconfirmed']);
    if (state.earned[t.id]) tags.push(['tag-earned', 'Earned']);
    return tags;
  }

  function renderChips() {
    var counts = {};
    state.trophies.forEach(function (t) {
      counts['category:' + t.category] = (counts['category:' + t.category] || 0) + 1;
      counts['grade:' + t.grade] = (counts['grade:' + t.grade] || 0) + 1;
    });
    var earnedCount = Object.keys(state.earned).filter(function (id) { return state.earned[id]; }).length;
    var missableCount = state.trophies.filter(function (t) { return t.missable; }).length;
    var unconfirmedCount = state.trophies.filter(function (t) { return t.method_status !== 'confirmed'; }).length;

    var chips = [{ type: 'all', label: 'All ' + state.trophies.length }];
    ['story', 'collectibles', 'activities', 'crime', 'strangers', 'misc', 'platinum'].forEach(function (cat) {
      chips.push({ type: 'category', value: cat, label: CATEGORY_LABELS[cat] + ' ' + (counts['category:' + cat] || 0) });
    });
    ['platinum', 'gold', 'silver', 'bronze'].forEach(function (g) {
      chips.push({ type: 'grade', value: g, label: GRADE_LABELS[g] + ' ' + (counts['grade:' + g] || 0) });
    });
    chips.push({ type: 'earned', label: 'Earned ' + earnedCount });
    chips.push({ type: 'remaining', label: 'Remaining ' + (state.trophies.length - earnedCount) });
    chips.push({ type: 'missable', label: 'Missable ' + missableCount });
    chips.push({ type: 'unconfirmed', label: 'Unconfirmed ' + unconfirmedCount });

    $('chips').innerHTML = chips.map(function (c) {
      var active = state.filter.type === c.type && (c.type === 'all' || state.filter.value === c.value || (c.type !== 'category' && c.type !== 'grade'));
      var label = c.type === 'category' ? 'Filter by category ' + CATEGORY_LABELS[c.value]
        : c.type === 'grade' ? 'Filter by grade ' + GRADE_LABELS[c.value]
        : 'Filter: ' + c.label;
      return '<button class="chip" type="button" data-filter-type="' + c.type + '" data-filter-value="' + esc(c.value || '') + '"' +
        ' aria-pressed="' + active + '" aria-label="' + esc(label) + '">' + esc(c.label) + '</button>';
    }).join('');

    $('chips').querySelectorAll('.chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var type = btn.getAttribute('data-filter-type');
        var value = btn.getAttribute('data-filter-value') || undefined;
        state.filter = type === 'all' ? { type: 'all' } : { type: type, value: value };
        renderAll();
      });
    });
  }

  function renderChecklist() {
    var shown = state.trophies.filter(matches);
    $('count-line').textContent = 'Showing ' + shown.length + ' of ' + state.trophies.length + ' trophies.';
    var groups = {};
    shown.forEach(function (t) {
      (groups[t.stage] = groups[t.stage] || []).push(t);
    });
    var html = '';
    Object.keys(groups).sort(function (a, b) { return a - b; }).forEach(function (stage) {
      var list = groups[stage];
      html += '<section class="stage-group"><h3>Stage ' + stage + ' — ' + esc(STAGE_NAMES[stage]) + ' (' + list.length + ')</h3>';
      list.forEach(function (t) {
        var d = detailsFor(t.id);
        var tags = tagsFor(t).map(function (tag) {
          return '<span class="tag ' + tag[0] + '">' + esc(tag[1]) + '</span>';
        }).join('');
        html += '<div class="trophy-row' + (state.earned[t.id] ? ' earned' : '') + (state.selectedId === t.id ? ' selected' : '') + '" role="button" tabindex="0" data-trophy-id="' + esc(t.id) + '">' +
          '<input type="checkbox" class="trophy-check" data-check-id="' + esc(t.id) + '"' + (state.earned[t.id] ? ' checked' : '') + ' aria-label="Mark ' + esc(t.name) + ' earned">' +
          '<span class="trophy-main"><span class="trophy-name">' + esc(t.name) + '</span>' +
          '<span class="trophy-sub grade-' + esc(t.grade) + '"> ' + esc(GRADE_LABELS[t.grade]) + ' · ' + t.psn_points + ' pts · Stage ' + t.stage + '</span>' +
          '<span class="tags">' + tags + '</span></span>' +
          '<span class="trophy-sources">' + (d.sources || []).length + ' sources</span></div>';
      });
      html += '</section>';
    });
    $('stage-groups').innerHTML = html || '<p>No trophies match this filter.</p>';

    $('stage-groups').querySelectorAll('.trophy-row').forEach(function (row) {
      row.addEventListener('click', function (e) {
        if (e.target.classList.contains('trophy-check')) return;
        selectTrophy(row.getAttribute('data-trophy-id'));
      });
      row.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectTrophy(row.getAttribute('data-trophy-id')); }
      });
    });
    $('stage-groups').querySelectorAll('.trophy-check').forEach(function (box) {
      box.addEventListener('change', function () {
        var id = box.getAttribute('data-check-id');
        if (box.checked) state.earned[id] = true; else delete state.earned[id];
        state.demo = false;
        saveStore();
        renderAll();
      });
    });
  }

  function renderDetail() {
    var t = trophyById(state.selectedId) || state.trophies[0];
    if (!t) return;
    var d = detailsFor(t.id);
    $('detail-grade').textContent = GRADE_LABELS[t.grade] + ' · ' + t.psn_points + ' PSN points';
    $('detail-grade').className = 'detail-grade grade-' + t.grade;
    $('detail-name').textContent = t.name;
    var pos = roadmapPosition(t.id);
    $('detail-meta').textContent = 'Trophy ' + pos + '/55 in roadmap order · Stage ' + t.stage + ' — ' + STAGE_NAMES[t.stage] + ' · ' + CATEGORY_LABELS[t.category] + ' · Source: ' + t.source + ', ' + t.source_date;
    $('detail-tags').innerHTML = tagsFor(t).map(function (tag) {
      return '<span class="tag ' + tag[0] + '">' + esc(tag[1]) + '</span>';
    }).join('');
    $('detail-official').textContent = '\u201C' + t.official + '\u201D';
    $('detail-guide').textContent = t.guide;
    $('detail-steps').innerHTML = (d.steps || []).map(function (s, i) {
      var cites = (s.src || []).map(function (n) {
        var src = sourceByNum(n);
        return src ? src.site : ('#' + n);
      }).join(', ');
      return '<li><span class="step-text">' + esc(s.text) + '</span> <span class="cite">[' + esc(cites) + ']</span></li>';
    }).join('');

    var watch = d.watch ? WATCH_TEXT[t.id] : null;
    $('watch-box').hidden = !watch;
    if (watch) $('watch-text').textContent = watch;

    // PMA meditation stepper (demo count 6/18).
    var isPMA = t.id === 'positive-mental-attitude';
    $('count-stepper').hidden = !isPMA;
    if (isPMA) {
      var count = state.counts[t.id] || 0;
      $('count-value').textContent = count + '/18';
      $('count-note').textContent = 'meditations done — the 100% checklist needs 15, this trophy needs all 18';
    }

    $('disputes').innerHTML = (d.disputes || []).map(function (dp) {
      var cites = (dp.sources || []).map(function (n) {
        var src = sourceByNum(n);
        return src ? src.site : ('#' + n);
      }).join(', ');
      return '<section class="dispute"><h3>Sources differ</h3><p>' + esc(dp.q) + '</p>' +
        '<div class="versions"><div class="version"><strong>Version A</strong>' + esc(dp.a) + '</div>' +
        '<div class="version"><strong>Version B</strong>' + esc(dp.b) + '</div></div>' +
        '<p class="call"><strong>Our call:</strong> ' + esc(dp.call) + '</p>' +
        '<p class="cite">Sources: ' + esc(cites) + '</p></section>';
    }).join('');

    $('toggle-spoiler').setAttribute('aria-pressed', String(state.spoilersShown));
    $('toggle-spoiler').textContent = state.spoilersShown ? 'Hide guide & steps' : 'Show guide & steps';
    $('spoiler-body').hidden = !state.spoilersShown;

    // Right sidebar: next up, goal, per-trophy sources.
    var order = roadmapOrder();
    var next = order.filter(function (x) { return !state.earned[x.id] && x.grade !== 'platinum'; }).slice(0, 5);
    $('next-up').innerHTML = next.map(function (x) {
      return '<li><a href="#" data-next-id="' + esc(x.id) + '">' + esc(x.name) + '</a> <span class="trophy-sub">(' + esc(GRADE_LABELS[x.grade]) + ', Stage ' + x.stage + ')</span></li>';
    }).join('') || '<li>All non-platinum trophies earned.</li>';
    $('next-up').querySelectorAll('[data-next-id]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); selectTrophy(a.getAttribute('data-next-id')); });
    });
    var earnedCount = Object.keys(state.earned).filter(function (id) { return state.earned[id]; }).length;
    var milestones = [14, 28, 41, 54];
    var nextMilestone = milestones.find(function (m) { return earnedCount < m; }) || 55;
    $('goal-text').textContent = earnedCount >= 55
      ? 'Platinum earned — Vice Got a Price! is yours. 1,350 PSN points.'
      : 'Goal: reach ' + nextMilestone + ' of 55 trophies (' + Math.round(nextMilestone / 55 * 100) + '%) — ' + (nextMilestone - earnedCount) + ' to go. The Platinum, Vice Got a Price!, pops when the other 54 are done.';
    $('per-sources').innerHTML = (d.sources || []).map(function (n) {
      var src = sourceByNum(n);
      if (!src) return '<li>Source ' + n + '</li>';
      return '<li><a href="' + esc(src.url) + '" target="_blank" rel="noopener">' + esc(src.title) + '</a> <span class="src-meta">(' + esc(src.site) + ', ' + esc(src.date) + ')</span></li>';
    }).join('');
  }

  function renderProgress() {
    var earnedCount = Object.keys(state.earned).filter(function (id) { return state.earned[id]; }).length;
    var points = state.trophies.reduce(function (sum, t) { return sum + (state.earned[t.id] ? t.psn_points : 0); }, 0);
    $('earned-count').textContent = earnedCount;
    $('earned-points').textContent = points;
    $('progress-pct').textContent = Math.round(earnedCount / 55 * 100) + '%';
    $('bar-fill').style.width = (earnedCount / 55 * 100) + '%';
    $('demo-note').hidden = !state.demo;
  }

  function renderAudit() {
    var steps = 0, cited = 0, backedTwo = 0, guidesTwo = 0, disputes = 0;
    state.trophies.forEach(function (t) {
      var d = detailsFor(t.id);
      var used = new Set();
      (d.steps || []).forEach(function (s) {
        steps += 1;
        if (s.src && s.src.length) { cited += 1; if (s.src.length >= 2) backedTwo += 1; s.src.forEach(function (n) { used.add(n); }); }
      });
      (d.disputes || []).forEach(function (dp) { disputes += 1; (dp.sources || []).forEach(function (n) { used.add(n); }); });
      if (used.size >= 2) guidesTwo += 1;
    });
    $('audit-steps').textContent = cited + '/' + steps;
    $('audit-backed').textContent = String(backedTwo);
    $('audit-guides').textContent = guidesTwo + '/' + state.trophies.length;
  }

  function renderRoadmap() {
    var order = roadmapOrder();
    var stagesHtml = '';
    Object.keys(STAGE_NAMES).forEach(function (stage) {
      var list = order.filter(function (t) { return String(t.stage) === String(stage); });
      var earnedIn = list.filter(function (t) { return state.earned[t.id]; }).length;
      var names = list.map(function (t) { return t.name + (state.earned[t.id] ? ' ✓' : ''); }).join(', ');
      stagesHtml += '<li><h4>Stage ' + stage + ' — ' + esc(STAGE_NAMES[stage]) + '</h4>' +
        '<p>' + esc(names) + '</p><p class="stage-progress">' + earnedIn + '/' + list.length + ' earned</p></li>';
    });
    $('stages').innerHTML = stagesHtml;
    $('checklist-story').innerHTML = CHECKLIST_100.story.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    $('checklist-activities').innerHTML = CHECKLIST_100.activities.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    $('checklist-discovery').innerHTML = CHECKLIST_100.discovery.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
  }

  function renderMissables() {
    var watchIds = Object.keys(WATCH_TEXT);
    $('watch-list').innerHTML = watchIds.map(function (id) {
      var t = trophyById(id);
      if (!t) return '';
      return '<li><strong>' + esc(t.name) + '</strong> — ' + esc(WATCH_TEXT[id]) + '</li>';
    }).join('');
  }

  function renderSources() {
    $('source-list').innerHTML = state.sources.map(function (s) {
      var cited = citedByCount(s.n);
      return '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.title) + '</a> <span class="src-meta">— ' + esc(s.site) + ', ' + esc(s.date) + (s.note ? ' — ' + esc(s.note) : '') + '</span>' +
        '<br><span class="src-cited">cited by ' + cited + ' of 55 guides</span></li>';
    }).join('');
  }

  function setTab(tab) {
    state.tab = tab;
    ['tracker', 'roadmap', 'missables', 'sources'].forEach(function (name) {
      $('tab-' + name).classList.toggle('active', name === tab);
      $('tab-' + name).setAttribute('aria-selected', String(name === tab));
      $('panel-' + name).hidden = name !== tab;
    });
  }

  function selectTrophy(id) {
    if (!trophyById(id)) return;
    state.selectedId = id;
    setTab('tracker');
    renderChecklist();
    renderDetail();
    var url = new URL(window.location.href);
    url.searchParams.set('t', id);
    window.history.replaceState(null, '', url.toString());
  }

  function renderAll() {
    renderChips();
    renderChecklist();
    renderDetail();
    renderProgress();
    renderAudit();
    renderRoadmap();
    renderMissables();
    renderSources();
  }

  function bindStatic() {
    $('search').addEventListener('input', function () {
      state.query = $('search').value.trim().toLowerCase();
      renderChecklist();
    });
    document.querySelectorAll('.tab').forEach(function (btn) {
      btn.addEventListener('click', function () { setTab(btn.getAttribute('data-tab')); });
    });
    $('toggle-spoiler').addEventListener('click', function () {
      state.spoilersShown = !state.spoilersShown;
      renderDetail();
    });
    $('count-minus').addEventListener('click', function () {
      var id = state.selectedId;
      state.counts[id] = Math.max(0, (state.counts[id] || 0) - 1);
      state.demo = false;
      saveStore();
      renderDetail();
      renderProgress();
    });
    $('count-plus').addEventListener('click', function () {
      var id = state.selectedId;
      state.counts[id] = Math.min(18, (state.counts[id] || 0) + 1);
      state.demo = false;
      saveStore();
      renderDetail();
      renderProgress();
    });
    $('export-btn').addEventListener('click', function () {
      var blob = new Blob([JSON.stringify({ earned: state.earned, counts: state.counts }, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'leonida-tracker-progress.json';
      a.click();
      URL.revokeObjectURL(a.href);
    });
    $('import-btn').addEventListener('click', function () { $('import-file').click(); });
    $('import-file').addEventListener('change', function () {
      var file = $('import-file').files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(reader.result);
          state.earned = data.earned || {};
          state.counts = data.counts || {};
          state.demo = false;
          saveStore();
          renderAll();
        } catch (e) { alert('That file is not valid tracker progress JSON.'); }
      };
      reader.readAsText(file);
    });
    $('reset-btn').addEventListener('click', function () {
      state.earned = {};
      state.counts = {};
      state.demo = false;
      saveStore();
      renderAll();
    });
  }

  function init() {
    loadStore();
    Promise.all([loadJSON('data/trophies.json'), loadJSON('data/details.json'), loadJSON('data/sources.json')])
      .then(function (results) {
        state.trophies = results[0].trophies;
        var detailList = results[1].details;
        detailList.forEach(function (e) { state.details[e.id] = e; });
        state.sources = results[2].sources;

        var params = new URLSearchParams(window.location.search);
        var tab = params.get('tab');
        if (tab && ['tracker', 'roadmap', 'missables', 'sources'].indexOf(tab) !== -1) setTab(tab);
        var grade = params.get('grade');
        if (grade && GRADE_LABELS[grade]) state.filter = { type: 'grade', value: grade };
        var t = params.get('t');
        if (t && trophyById(t)) state.selectedId = t;

        bindStatic();
        renderAll();
        setTab(state.tab);
      })
      .catch(function (err) {
        document.body.insertAdjacentHTML('afterbegin', '<p style="padding:1rem;color:#8c2f1b">Could not load the trophy data: ' + esc(err.message) + '</p>');
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
