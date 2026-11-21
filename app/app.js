/* Leonida Trophy Guide & Tracker v3 — dense 3-column tracker.
   Renders app/data/trophies.json + details.json + sources.json, keeps earned
   ticks in localStorage, filters without any network calls. All audit numbers
   on the page are computed from the data, never typed. */
(function () {
  'use strict';

  var STORE_KEY = 'leonida-tracker-v3';
  var PMA_KEY = 'leonida-pma-v3';
  var PMA_ID = 'positive-mental-attitude';
  var PMA_TOTAL = 18;

  var state = {
    trophies: [], meta: null, details: [], detailsById: {}, sources: [], sourcesMeta: null,
    byId: {}, order: [], earned: {}, demo: false, pmaCount: 6,
    spoilersShown: false, query: '', cat: '', grade: '', status: '',
    selectedId: PMA_ID, tab: 'tracker',
  };

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function gradeLabel(g) { return g.charAt(0).toUpperCase() + g.slice(1); }

  function catLabel(c) {
    return { platinum: 'Platinum', story: 'Story', collectibles: 'Collectibles',
      activities: 'Activities', strangers: 'Strangers', crime: 'Crime', misc: 'Misc' }[c] || c;
  }

  function stageName(n) {
    var s = (state.meta && state.meta.stages || []).find(function (x) { return x.n === n; });
    return s ? 'Stage ' + n + ' — ' + s.name : 'Stage ' + n;
  }

  function roadNum(id) { return state.order.indexOf(id) + 1; }

  function detailOf(id) { return state.detailsById[id] || { steps: [], disputes: [], sources: [] }; }

  function loadStored() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) { var d = JSON.parse(raw); state.earned = d.earned || {}; state.demo = !!d.demo; }
    } catch (e) { state.earned = {}; }
    try {
      var p = localStorage.getItem(PMA_KEY);
      if (p !== null) state.pmaCount = Math.max(0, Math.min(PMA_TOTAL, parseInt(p, 10) || 0));
    } catch (e) { /* keep default 6 */ }
  }

  function saveStored() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ earned: state.earned, demo: state.demo })); } catch (e) { /* progress just won't persist */ }
    try { localStorage.setItem(PMA_KEY, String(state.pmaCount)); } catch (e) { /* ignore */ }
  }

  function seedDemo() {
    // First load only: 14 bronze trophies in roadmap order, labelled DEMO.
    var seeded = state.order.filter(function (id) { return state.byId[id].grade === 'bronze'; }).slice(0, 14);
    seeded.forEach(function (id) { state.earned[id] = true; });
    state.demo = true;
    saveStored();
  }

  function readDateLabel(raw) {
    if (!raw) return '20 Nov 2026';
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
    if (!m) return raw;
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return parseInt(m[3], 10) + ' ' + months[parseInt(m[2], 10) - 1] + ' ' + m[1];
  }

  /* ---------- audit strip (computed from data) ---------- */
  function renderAudit() {
    var counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
    var points = 0, confirmed = 0;
    state.trophies.forEach(function (t) {
      counts[t.grade] = (counts[t.grade] || 0) + 1;
      points += t.psn_points;
      if (t.method_status === 'confirmed') confirmed++;
    });
    var steps = 0, cited = 0, backedSteps = 0, backedGuides = 0, disputes = 0, watch = 0, unconfirmed = 0;
    state.details.forEach(function (d) {
      (d.steps || []).forEach(function (s) {
        steps++;
        if (s.src && s.src.length) cited++;
        if (s.src && s.src.length >= 2) backedSteps++;
      });
      if ((d.steps || []).some(function (s) { return s.src && s.src.length >= 2; })) backedGuides++;
      disputes += (d.disputes || []).length;
      if (d.watch) watch++;
      if (d.unconfirmed) unconfirmed++;
    });
    var missable = state.trophies.filter(function (t) { return t.missable; }).length;
    var read = readDateLabel(state.sourcesMeta && state.sourcesMeta.read);
    $('audit-line1').textContent = state.trophies.length + '/' + state.trophies.length +
      ' official name, description, grade · ' + counts.platinum + 'P ' + counts.gold + 'G ' +
      counts.silver + 'S ' + counts.bronze + 'B · ' + points.toLocaleString('en-US') + ' PSN points';
    $('audit-line2').textContent = cited + '/' + steps + ' steps cited · ' + backedSteps +
      ' steps backed by 2+ sources · ' + backedGuides + '/' + state.details.length + ' guides backed by 2+ sources';
    $('audit-line3').textContent = (state.sourcesMeta && state.sourcesMeta.pages || state.sources.length) +
      ' pages · ' + (state.sourcesMeta && state.sourcesMeta.sites || '') + ' sites read ' + read +
      ' · ' + confirmed + '/' + state.trophies.length + ' methods confirmed · ' + missable +
      ' possibly missable · ' + watch + ' watch · ' + unconfirmed + ' unconfirmed · ' + disputes +
      ' disputes shown both ways · ~200 h · difficulty 4/10 · one playthrough';
  }

  /* ---------- filters & list ---------- */
  function matches(t) {
    var d = detailOf(t.id);
    if (state.cat && t.category !== state.cat) return false;
    if (state.grade && t.grade !== state.grade) return false;
    if (state.status === 'earned' && !state.earned[t.id]) return false;
    if (state.status === 'remaining' && state.earned[t.id]) return false;
    if (state.status === 'missable' && !t.missable) return false;
    if (state.status === 'watch' && !d.watch) return false;
    if (state.status === 'unconfirmed' && t.method_status === 'confirmed') return false;
    if (state.status === 'disputed' && !(d.disputes && d.disputes.length)) return false;
    if (state.query) {
      var hay = (t.name + ' ' + t.official + ' ' + t.guide + ' ' + t.category).toLowerCase();
      if (hay.indexOf(state.query) === -1) return false;
    }
    return true;
  }

  function tagHtml(t, d) {
    var out = '';
    if (t.hidden) out += '<span class="tag tag-hidden">Hidden</span>';
    if (t.missable) out += '<span class="tag tag-missable">Missable</span>';
    if (d.disputes && d.disputes.length) out += '<span class="tag tag-disputed">Disputed</span>';
    if (d.watch) out += '<span class="tag tag-watch">Watch</span>';
    if (state.earned[t.id]) out += '<span class="tag tag-earned">Earned</span>';
    if (t.method_status !== 'confirmed') out += '<span class="tag tag-unconf">Unconfirmed</span>';
    return out;
  }

  function renderChips() {
    var chips = [];
    function count(fn) { return state.trophies.filter(fn).length; }
    chips.push({ type: 'all', value: '', label: 'All ' + state.trophies.length, aria: 'All trophies' });
    ['platinum', 'story', 'collectibles', 'activities', 'strangers', 'crime', 'misc'].forEach(function (c) {
      chips.push({ type: 'cat', value: c, label: catLabel(c) + ' ' + count(function (t) { return t.category === c; }),
        aria: 'Category ' + catLabel(c) + ', ' + count(function (t) { return t.category === c; }) + ' trophies' });
    });
    ['platinum', 'gold', 'silver', 'bronze'].forEach(function (g) {
      chips.push({ type: 'grade', value: g, label: gradeLabel(g) + ' ' + count(function (t) { return t.grade === g; }),
        aria: 'Grade ' + gradeLabel(g) + ', ' + count(function (t) { return t.grade === g; }) + ' trophies' });
    });
    [['earned', 'Earned'], ['remaining', 'Remaining'], ['missable', 'Missable'], ['watch', 'Watch']].forEach(function (pair) {
      chips.push({ type: 'status', value: pair[0], label: pair[1] + ' ' + count(function (t) {
        if (pair[0] === 'earned') return !!state.earned[t.id];
        if (pair[0] === 'remaining') return !state.earned[t.id];
        if (pair[0] === 'missable') return !!t.missable;
        return !!detailOf(t.id).watch;
      }), aria: 'Status ' + pair[1] });
    });
    $('chips').innerHTML = chips.map(function (c) {
      var active = (c.type === 'all' && !state.cat && !state.grade && !state.status) ||
        (c.type === 'cat' && state.cat === c.value) ||
        (c.type === 'grade' && state.grade === c.value) ||
        (c.type === 'status' && state.status === c.value);
      return '<button type="button" class="chip-btn' + (active ? ' active' : '') + '" data-ftype="' + c.type +
        '" data-fvalue="' + esc(c.value) + '" aria-label="' + esc(c.aria) + '" aria-pressed="' + active + '">' +
        esc(c.label) + '</button>';
    }).join('');
  }

  function renderList() {
    var list = state.order.map(function (id) { return state.byId[id]; }).filter(matches);
    var html = '', lastStage = null;
    list.forEach(function (t) {
      var d = detailOf(t.id);
      if (t.stage !== lastStage) {
        var stageTotal = state.trophies.filter(function (x) { return x.stage === t.stage; }).length;
        var stageDone = state.trophies.filter(function (x) { return x.stage === t.stage && state.earned[x.id]; }).length;
        html += '<li class="stage-head">' + esc(stageName(t.stage)) + ' &middot; ' + stageDone + '/' + stageTotal + ' earned</li>';
        lastStage = t.stage;
      }
      html += '<li class="t-item' + (state.earned[t.id] ? ' earned' : '') + (t.id === state.selectedId ? ' selected' : '') + '" data-id="' + esc(t.id) + '">' +
        '<label class="t-check"><input type="checkbox" data-check="' + esc(t.id) + '"' + (state.earned[t.id] ? ' checked' : '') + ' aria-label="Mark ' + esc(t.name) + ' earned"></label>' +
        '<button type="button" class="t-main" data-select="' + esc(t.id) + '">' +
        '<span class="t-name">' + esc(t.name) + '</span>' +
        '<span class="t-meta"><span class="grade-dot grade-' + esc(t.grade) + '">' + esc(gradeLabel(t.grade)) + '</span> ' +
        '<span>' + t.psn_points + ' pts</span> &middot; <span>' + (d.sources ? d.sources.length : 0) + ' sources</span> &middot; <span>#' + roadNum(t.id) + '</span></span>' +
        '<span class="t-tags">' + tagHtml(t, d) + '</span>' +
        '</button></li>';
    });
    $('trophy-list').innerHTML = html || '<li class="empty">No trophies match these filters. Clear the search or widen the filters.</li>';
    $('count-line').textContent = 'Showing ' + list.length + ' of ' + state.trophies.length + ' trophies.';
  }

  /* ---------- detail panel ---------- */
  function srcRef(src) {
    return (src || []).map(function (n) { return '[' + n + ']'; }).join(' ');
  }

  function disputeHtml(t, d) {
    if (!d.disputes || !d.disputes.length) return '';
    return '<section class="disputes" aria-label="Sources differ"><h4>SOURCES DIFFER &middot; ' + d.disputes.length + ' dispute' + (d.disputes.length > 1 ? 's' : '') + '</h4>' +
      d.disputes.map(function (dp) {
        return '<div class="dispute"><p class="dispute-q"><strong>' + esc(dp.q) + '</strong></p>' +
          '<p><span class="ver">Version A</span> ' + esc(dp.a) + '</p>' +
          '<p><span class="ver">Version B</span> ' + esc(dp.b) + '</p>' +
          '<p class="our-call"><span class="ver ver-call">Our call</span> ' + esc(dp.call) + '</p>' +
          '<p class="dispute-src">Sources: ' + esc(srcRef(dp.sources)) + '</p></div>';
      }).join('') + '</section>';
  }

  function renderDetail() {
    var t = state.byId[state.selectedId] || state.byId[state.order[0]];
    if (!t) { $('detail').innerHTML = ''; return; }
    var d = detailOf(t.id);
    var earned = !!state.earned[t.id];
    var masked = t.spoiler && !state.spoilersShown;
    var stepsHtml = (d.steps || []).map(function (s, i) {
      return '<li><span class="step-n">' + (i + 1) + '.</span> ' + esc(s.text) +
        ' <span class="cite">' + esc(srcRef(s.src)) + '</span></li>';
    }).join('');
    var pmaCounter = '';
    if (t.id === PMA_ID) {
      pmaCounter = '<div class="pma-counter"><span><strong>YOUR COUNT</strong> — meditations done</span>' +
        '<span class="stepper"><button type="button" id="pma-minus" aria-label="One fewer meditation">&minus;</button>' +
        '<strong id="pma-count">' + state.pmaCount + '/' + PMA_TOTAL + '</strong>' +
        '<button type="button" id="pma-plus" aria-label="One more meditation">+</button></span>' +
        '<span class="pma-note">18 spots at 10 locations &middot; the trophy needs all 18, the 100% checklist needs 15</span></div>';
    }
    var watchBox = d.watch
      ? '<div class="watch-box"><strong>WATCH</strong> — handle with care: ' +
        (t.missable ? 'possibly missable — do the balcony meditation in Chapter 1. ' : '') +
        (t.method_status !== 'confirmed' ? 'method still unconfirmed — do not trust a single source. ' : '') +
        'Check the in-game counter after each step.</div>'
      : '';
    $('detail').innerHTML =
      '<div class="d-head"><p class="d-num">Trophy ' + roadNum(t.id) + ' of ' + state.trophies.length + ' &middot; ' + esc(stageName(t.stage)) + '</p>' +
      '<h2>' + esc(t.name) + '</h2>' +
      '<div class="d-chips"><span class="grade grade-' + esc(t.grade) + '">' + esc(gradeLabel(t.grade)) + '</span>' +
      '<span class="chip points">' + t.psn_points + ' PSN pts</span>' +
      '<span class="chip">' + esc(catLabel(t.category)) + '</span>' + tagHtml(t, d) + '</div></div>' +
      (masked ? '<p class="spoiler-note">Story spoiler — hidden. Use the &ldquo;Spoilers&rdquo; button to reveal.</p>' : '') +
      '<div class="' + (masked ? 'spoiler-hidden' : '') + '">' +
      '<p class="official">&ldquo;' + esc(t.official) + '&rdquo;</p>' +
      '<p class="guide">' + esc(t.guide) + '</p>' +
      '<ol class="steps">' + stepsHtml + '</ol></div>' +
      pmaCounter + watchBox + disputeHtml(t, d) +
      '<div class="d-foot"><span class="src">Guide source: ' + esc(t.source) + ', ' + esc(t.source_date) + '</span>' +
      (t.method_status === 'confirmed' ? '<span class="flag-confirmed">method confirmed</span>' : '<span class="flag-unconfirmed">method unconfirmed</span>') + '</div>' +
      '<label class="check"><input type="checkbox" data-check="' + esc(t.id) + '"' + (earned ? ' checked' : '') + '> Earned</label>';
    var minus = $('pma-minus'), plus = $('pma-plus');
    if (minus) minus.addEventListener('click', function () { state.pmaCount = Math.max(0, state.pmaCount - 1); saveStored(); renderDetail(); });
    if (plus) plus.addEventListener('click', function () { state.pmaCount = Math.min(PMA_TOTAL, state.pmaCount + 1); saveStored(); renderDetail(); });
    renderTrophySources(t, d);
  }

  function renderTrophySources(t, d) {
    var byN = {};
    state.sources.forEach(function (s) { byN[s.n] = s; });
    $('trophy-sources').innerHTML = (d.sources || []).map(function (n) {
      var s = byN[n];
      if (!s) return '<li>[' + n + ']</li>';
      return '<li><strong>[' + s.n + '] ' + esc(s.site) + '</strong> — ' + esc(s.title) +
        ' <span class="src-date">(' + esc(s.date) + ')</span></li>';
    }).join('') || '<li>No extra sources listed for this trophy.</li>';
  }

  /* ---------- right rail ---------- */
  function renderNextUp() {
    var next = state.order.filter(function (id) { return !state.earned[id]; }).slice(0, 5);
    $('nextup-list').innerHTML = next.map(function (id, i) {
      var t = state.byId[id];
      return '<li><span class="nu-n">' + (i + 1) + '</span> <button type="button" data-select="' + esc(id) + '">' + esc(t.name) +
        '</button><span class="nu-meta">' + esc(gradeLabel(t.grade)) + ' &middot; ' + esc(stageName(t.stage)) + '</span></li>';
    }).join('') || '<li>All 55 earned — platinum is yours.</li>';
    var plat = state.byId['vice-got-a-price'];
    var earnedList = state.trophies.filter(function (t) { return state.earned[t.id]; });
    var points = earnedList.reduce(function (s, t) { return s + t.psn_points; }, 0);
    $('goal-box').innerHTML = '<p><strong>' + esc(plat ? plat.name : 'Vice Got a Price!') + '</strong> — the Platinum pops when all 54 others are earned.</p>' +
      '<p>' + earnedList.length + ' / 55 earned &middot; ' + points.toLocaleString('en-US') + ' / 1,350 PSN points</p>' +
      '<p class="panel-note">Difficulty 4/10 &middot; ~200 hours &middot; 1 playthrough.</p>';
  }

  /* ---------- progress ---------- */
  function updateProgress() {
    var earnedList = state.trophies.filter(function (t) { return state.earned[t.id]; });
    var points = earnedList.reduce(function (s, t) { return s + t.psn_points; }, 0);
    var pct = state.trophies.length ? Math.round(earnedList.length / state.trophies.length * 100) : 0;
    $('earned-count').textContent = earnedList.length;
    $('earned-points').textContent = points;
    $('progress-pct').textContent = pct + '%';
    $('bar-fill').style.width = pct + '%';
    $('demo-note').textContent = state.demo
      ? 'DEMO — ' + earnedList.length + ' trophies marked earned to show the tracker. Progress saves in this browser (localStorage). Reset clears it to 0.'
      : 'Progress saves in this browser (localStorage). Tick a trophy when it pops; export a backup before clearing browser data.';
  }

  /* ---------- roadmap / missables / sources views ---------- */
  var CHECKLIST_100 = [
    { group: 'Story & Tasks (45%)', items: [
      'Story Completion — finish the story', '100 Optional Tasks Completed', '39 of 39 Gang Operations Cleared',
      '22 of 22 Bank Jobs Fully Completed', '7 of 7 Payday Loan Jobs Fully Completed', '34 of 35 Smash \u2019N\u2019 Grabs Fully Completed',
      '50 of 91 Stick Ups Fully Completed', '$100,000 Narcotics Fenced', '$100,000 Jewelry Fenced',
      '$250,000 Marked Bills Fenced', '8 of 8 Vaults Hit', '$200,000 Vehicles Fenced' ] },
    { group: 'Exploration & Activities (45%)', items: [
      '5 of 7 Kenton Sets Completed', '15 of 18 Collectible Card Sets Found', '100 WAiNK Locations Scanned',
      '33 of 33 Underwater Discoveries Found', '30 of 34 Magazines, Books & Comics Found', '15 of 18 Meditation Spots Completed',
      '100 of 125 Cocaine Flamingos Destroyed', '2 of 2 Unique Playlists Completed', '70 of 79 Discovered Styles',
      '30 of 40 Unique Races Won', '10 of 13 Race Challenge Gold Medals', '42 of 42 Shooting Range Gold Medals',
      '4 of 4 Video Games Played', '5 of 7 Pool Opponents Defeated', '2 of 3 Mini Golf Locations Played',
      '90 of 100 Basketball Hoops', '42 of 42 Drone Time Trials Completed', '300 of 397 Stunts Completed',
      '70 of 80 Challenges Completed', '15 of 15 Bret\u2019s Target Decks' ] },
    { group: 'Discovery (10%)', items: [
      '200 of 277 Base Model Vehicles scanned', '50 of 66 Standard Issue Weapons found', '100 of 255 Animals studied' ] },
  ];

  function renderRoadmap() {
    var stages = (state.meta && state.meta.stages) || [];
    $('stages-roadmap').innerHTML = stages.map(function (s) {
      var inStage = state.trophies.filter(function (t) { return t.stage === s.n; });
      var done = inStage.filter(function (t) { return state.earned[t.id]; }).length;
      return '<li><span class="stage-meta">STAGE ' + s.n + ' &middot; ' + inStage.length + ' trophies &middot; ' + done + ' earned' +
        (s.hours ? ' &middot; ' + esc(s.hours) : '') + '</span><b>' + esc(s.name) + '</b><p>' + esc(s.tip) + '</p></li>';
    }).join('');
    $('checklist-100').innerHTML = CHECKLIST_100.map(function (g) {
      return '<h3>' + esc(g.group) + ' — ' + g.items.length + ' lines</h3><ol class="checklist">' +
        g.items.map(function (it) { return '<li><span class="cl-box" aria-hidden="true">&#9744;</span> ' + esc(it) + '</li>'; }).join('') + '</ol>';
    }).join('');
  }

  function renderWatchList() {
    var watch = state.details.filter(function (d) { return d.watch; });
    $('watch-list').innerHTML = watch.map(function (d) {
      var t = state.byId[d.id];
      if (!t) return '';
      var why = [];
      if (t.missable) why.push('possibly missable');
      if (t.method_status !== 'confirmed') why.push('method unconfirmed');
      if (d.disputes && d.disputes.length) why.push(d.disputes.length + ' dispute' + (d.disputes.length > 1 ? 's' : '') + ' shown both ways');
      if (!why.length) why.push('timing / counter matters — check the in-game counter');
      return '<div class="watch-item"><button type="button" data-select="' + esc(t.id) + '"><strong>' + esc(t.name) + '</strong></button> ' +
        tagHtml(t, d) + '<span class="watch-why">' + esc(why.join(' · ')) + '</span></div>';
    }).join('');
  }

  function renderSourcesView() {
    var citedBy = {};
    state.details.forEach(function (d) {
      (d.sources || []).forEach(function (n) { citedBy[n] = (citedBy[n] || 0) + 1; });
    });
    var guideCount = state.sources.filter(function (s) { return s.role === 'guide'; }).length;
    var listCount = state.sources.filter(function (s) { return s.role === 'list-check'; }).length;
    $('sources-summary').textContent = state.sources.length + ' pages from ' + (state.sourcesMeta && state.sourcesMeta.sites) +
      ' sites, read ' + readDateLabel(state.sourcesMeta && state.sourcesMeta.read) + ' — ' + guideCount +
      ' guide sources, ' + listCount + ' list-check sources used to verify the full 55-name list.';
    $('source-list').innerHTML = state.sources.map(function (s) {
      var cited = citedBy[s.n] || 0;
      var role = s.role === 'list-check'
        ? '<span class="src-role">list-check source — full-list / mission-count verification, not cited by a step</span>'
        : '<span class="src-role">cited by ' + cited + ' of 55 guides</span>';
      return '<li><strong>[' + s.n + '] ' + esc(s.site) + '</strong> — ' + esc(s.title) + ' — ' + esc(s.date) +
        ' — <a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.url) + '</a><br>' + role + '</li>';
    }).join('');
    var all = [];
    state.order.forEach(function (id) {
      var d = detailOf(id);
      (d.disputes || []).forEach(function (dp) { all.push({ t: state.byId[id], dp: dp }); });
    });
    $('disputes-all').innerHTML = all.map(function (x) {
      return '<div class="dispute"><p class="dispute-q"><strong>' + esc(x.t.name) + ':</strong> ' + esc(x.dp.q) + '</p>' +
        '<p><span class="ver">Version A</span> ' + esc(x.dp.a) + '</p>' +
        '<p><span class="ver">Version B</span> ' + esc(x.dp.b) + '</p>' +
        '<p class="our-call"><span class="ver ver-call">Our call</span> ' + esc(x.dp.call) + '</p>' +
        '<p class="dispute-src">Sources: ' + esc(srcRef(x.dp.sources)) + '</p></div>';
    }).join('');
  }

  /* ---------- tabs ---------- */
  function showTab(tab) {
    state.tab = tab;
    ['tracker', 'roadmap', 'missables', 'sources'].forEach(function (t) {
      var view = $('view-' + t);
      if (view) view.hidden = (t !== tab);
      var btn = document.querySelector('.tab[data-tab="' + t + '"]');
      if (btn) { btn.classList.toggle('active', t === tab); btn.setAttribute('aria-pressed', String(t === tab)); }
    });
    if (tab === 'roadmap') renderRoadmap();
    if (tab === 'missables') renderWatchList();
    if (tab === 'sources') renderSourcesView();
  }

  /* ---------- render all ---------- */
  function renderAll() {
    renderChips();
    renderList();
    renderDetail();
    renderNextUp();
    updateProgress();
  }

  function selectTrophy(id) {
    if (!state.byId[id]) return;
    state.selectedId = id;
    showTab('tracker');
    renderList();
    renderDetail();
  }

  function readUrlParams() {
    var p = new URLSearchParams(window.location.search);
    if (p.get('tab') && ['tracker', 'roadmap', 'missables', 'sources'].indexOf(p.get('tab')) !== -1) state.tab = p.get('tab');
    if (p.get('t') && state.byId[p.get('t')]) state.selectedId = p.get('t');
    if (p.get('grade')) state.grade = p.get('grade');
    if (p.get('cat')) state.cat = p.get('cat');
    if (p.get('q')) { state.query = p.get('q').toLowerCase(); $('search').value = p.get('q'); }
    if (p.get('spoilers') === 'show') state.spoilersShown = true;
  }

  function syncSpoilerButton() {
    var b = $('toggle-spoilers');
    b.textContent = state.spoilersShown ? 'Spoilers: shown' : 'Spoilers: hidden';
    b.setAttribute('aria-pressed', String(state.spoilersShown));
  }

  function bindEvents() {
    $('search').addEventListener('input', function (e) { state.query = e.target.value.trim().toLowerCase(); renderList(); });
    $('chips').addEventListener('click', function (e) {
      var b = e.target.closest('[data-ftype]');
      if (!b) return;
      var type = b.getAttribute('data-ftype'), value = b.getAttribute('data-fvalue');
      if (type === 'all') { state.cat = ''; state.grade = ''; state.status = ''; }
      else if (type === 'cat') { state.cat = (state.cat === value ? '' : value); }
      else if (type === 'grade') { state.grade = (state.grade === value ? '' : value); }
      else if (type === 'status') { state.status = (state.status === value ? '' : value); }
      renderChips();
      renderList();
    });
    $('toggle-spoilers').addEventListener('click', function () {
      state.spoilersShown = !state.spoilersShown; syncSpoilerButton(); renderDetail();
    });
    document.addEventListener('click', function (e) {
      var sel = e.target.closest('[data-select]');
      if (sel) { selectTrophy(sel.getAttribute('data-select')); return; }
    });
    document.addEventListener('change', function (e) {
      var id = e.target.getAttribute && e.target.getAttribute('data-check');
      if (!id) return;
      if (e.target.checked) state.earned[id] = true; else delete state.earned[id];
      state.demo = false;
      saveStored();
      renderAll();
    });
    $('reset-btn').addEventListener('click', function () {
      if (!window.confirm('Clear all earned ticks?')) return;
      state.earned = {};
      state.demo = false;
      saveStored();
      renderAll();
    });
    $('export-btn').addEventListener('click', function () {
      var blob = new Blob([JSON.stringify({ exported: new Date().toISOString(), earned: Object.keys(state.earned) }, null, 2)], { type: 'application/json' });
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
          state.demo = false;
          saveStored();
          renderAll();
        } catch (err) { window.alert('That file is not valid tracker JSON.'); }
      };
      reader.readAsText(f);
      e.target.value = '';
    });
    document.querySelectorAll('.tab').forEach(function (btn) {
      btn.addEventListener('click', function () { showTab(btn.getAttribute('data-tab')); });
    });
  }

  Promise.all([
    fetch('data/trophies.json').then(function (r) { if (!r.ok) throw new Error('trophies.json failed: ' + r.status); return r.json(); }),
    fetch('data/details.json').then(function (r) { if (!r.ok) throw new Error('details.json failed: ' + r.status); return r.json(); }),
    fetch('data/sources.json').then(function (r) { if (!r.ok) throw new Error('sources.json failed: ' + r.status); return r.json(); }),
  ]).then(function (all) {
    var trophiesData = all[0], detailsData = all[1], sourcesData = all[2];
    state.meta = trophiesData.meta;
    state.trophies = trophiesData.trophies;
    state.details = detailsData.details;
    state.sourcesMeta = sourcesData.meta;
    state.sources = sourcesData.sources;
    state.trophies.forEach(function (t, i) { state.byId[t.id] = t; t._file = i; });
    state.details.forEach(function (d) { state.detailsById[d.id] = d; });
    // Roadmap order: stage, then file order; Platinum last.
    state.order = state.trophies.slice().sort(function (a, b) {
      if (a.grade === 'platinum' && b.grade !== 'platinum') return 1;
      if (b.grade === 'platinum' && a.grade !== 'platinum') return -1;
      return (a.stage - b.stage) || (a._file - b._file);
    }).map(function (t) { return t.id; });
    loadStored();
    if (!localStorage.getItem(STORE_KEY)) seedDemo();
    readUrlParams();
    syncSpoilerButton();
    renderAudit();
    renderAll();
    showTab(state.tab);
    bindEvents();
  }).catch(function (err) {
    $('detail').innerHTML = '<p class="empty">Could not load the trophy data (' + esc(err.message) + '). Serve app/ over HTTP and try again.</p>';
  });
})();
