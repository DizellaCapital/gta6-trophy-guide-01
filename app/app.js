/* Leonida Trophy Guide & Tracker v3 — dense 3-column tracker.
   Renders app/data/trophies.json + details.json + sources.json, keeps earned
   ticks + meditation counts in localStorage, works fully offline. */
(function () {
  'use strict';

  var STORE_KEY = 'leonida-tracker-v3';
  var DEMO_EARNED = [
    'just-like-paradise', 'paradise-lost', 'tits-ass-drug-money',
    'vice-city-baby', 'trust', 'break-the-bank', 'family-matters',
    'dwnfall', 'hi-jacked', 'snow-storm', 'road-to-rehabilitation',
    'this-was-no-boat-accident', 'the-lone-rider', 'supply-and-demand'
  ];
  var DEMO_COUNTS = { 'positive-mental-attitude': 6 };

  var CHECKLIST_100 = {
    'Story & Tasks (12)': [
      'Story Completion (finish the story)', '100 Optional Tasks Completed',
      '39 of 39 Gang Operations Cleared', '22 of 22 Bank Jobs Fully Completed',
      '7 of 7 Payday Loan Jobs Fully Completed', '34 of 35 Smash \u2018N\u2019 Grabs Fully Completed',
      '50 of 91 Stick Ups Fully Completed', '$100,000 Narcotics Fenced',
      '$100,000 Jewelry Fenced', '$250,000 Marked Bills Fenced',
      '8 of 8 Vaults Hit', '$200,000 Vehicles Fenced'
    ],
    'Exploration & Activities (20)': [
      '5 of 7 Kenton Sets Completed', '15 of 18 Collectible Card Sets Found',
      '100 WAiNK Locations Scanned', '33 of 33 Underwater Discoveries Found',
      '30 of 34 Magazines, Books & Comics Found', '15 of 18 Meditation Spots Completed',
      '100 of 125 Cocaine Flamingos Destroyed', '2 of 2 Unique Playlists Completed',
      '70 of 79 Discovered Styles', '30 of 40 Unique Races Won',
      '10 of 13 Race Challenge Gold Medals', '42 of 42 Shooting Range Gold Medals',
      '4 of 4 Video Games Played', '5 of 7 Pool Opponents Defeated',
      '2 of 3 Mini Golf Locations Played', '90 of 100 Basketball Hoops',
      '42 of 42 Drone Time Trials Completed', '300 of 397 Stunts Completed',
      '70 of 80 Challenges Completed', '15 of 15 Bret\u2019s Target Decks'
    ],
    'Discovery (3)': [
      '200 of 277 Base Model Vehicles scanned',
      '50 of 66 Standard Issue Weapons found', '100 of 255 Animals studied'
    ]
  };

  var state = {
    trophies: [], meta: null, details: {}, sources: [], sourcesRead: '2026-11-20',
    order: [], roadmapIdx: {},
    earned: {}, counts: {}, demo: false, spoilersShown: false,
    query: '', filter: 'all', sort: 'roadmap', selected: 'positive-mental-attitude',
    tab: 'tracker'
  };

  function $(id) { return document.getElementById(id); }

  function fmtDate(iso) {
    var parts = String(iso).split('-');
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return parts.length === 3 ? (parseInt(parts[2], 10) + ' ' + months[parseInt(parts[1], 10) - 1] + ' ' + parts[0]) : String(iso);
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        state.earned = s.earned || {};
        state.counts = s.counts || {};
        state.demo = !!s.demo;
        return;
      }
    } catch (e) { /* fall through to demo seed */ }
    state.earned = {}; state.counts = {}; state.demo = true;
    DEMO_EARNED.forEach(function (id) { state.earned[id] = true; });
    Object.keys(DEMO_COUNTS).forEach(function (k) { state.counts[k] = DEMO_COUNTS[k]; });
    saveState();
  }

  function saveState() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        earned: state.earned, counts: state.counts, demo: state.demo
      }));
    } catch (e) { /* storage full or blocked: progress just won't persist */ }
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function byId(id) {
    for (var i = 0; i < state.trophies.length; i++) if (state.trophies[i].id === id) return state.trophies[i];
    return null;
  }
  function det(id) { return state.details[id] || null; }
  function src(n) {
    for (var i = 0; i < state.sources.length; i++) if (state.sources[i].n === n) return state.sources[i];
    return null;
  }
  function gradeLabel(g) { return g.charAt(0).toUpperCase() + g.slice(1); }
  function catLabel(c) {
    var m = { story: 'Story', crime: 'Crime & robbery', collectibles: 'Collectibles', activities: 'Activities', strangers: 'Strangers & Freaks', misc: 'Misc', platinum: 'Platinum' };
    return m[c] || c;
  }
  function stageName(n) {
    var s = (state.meta && state.meta.stages || []).find(function (x) { return x.n === n; });
    return s ? 'Stage ' + n + ' \u2014 ' + s.name : 'Stage ' + n;
  }
  function citedBy(n) {
    var c = 0;
    Object.keys(state.details).forEach(function (id) {
      if ((state.details[id].sources || []).indexOf(n) !== -1) c++;
    });
    return c;
  }
  function disputesOf(id) { var d = det(id); return d ? (d.disputes || []) : []; }

  function auditNumbers() {
    var steps = 0, cited = 0, backed2 = 0, tr2 = 0, disp = 0, watch = 0, unconf = 0, miss = 0;
    var sites = {};
    state.sources.forEach(function (s) { sites[s.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]] = true; });
    state.trophies.forEach(function (t) {
      var d = det(t.id);
      if (!d) return;
      if (t.missable) miss++;
      if (t.method_status === 'unconfirmed') unconf++;
      if (d.watch && !t.missable && t.method_status === 'confirmed') watch++;
      if ((d.sources || []).length >= 2) tr2++;
      disp += (d.disputes || []).length;
      (d.steps || []).forEach(function (st) {
        steps++;
        if (st.src && st.src.length) cited++;
        if (st.src && st.src.length >= 2) backed2++;
      });
    });
    return {
      steps: steps, cited: cited, backed2: backed2, tr2: tr2, disp: disp,
      watch: watch, unconf: unconf, miss: miss,
      pages: state.sources.length, sites: Object.keys(sites).length
    };
  }

  function renderAudit() {
    var a = auditNumbers();
    var c = state.meta.counts;
    var row1 = '<div class="audit-row"><b>AUDIT</b><span class="sep">\u00b7</span>' +
      '55/55 official name, description, grade<span class="sep">\u00b7</span>' +
      '1P 2G 6S 46B<span class="sep">\u00b7</span>' +
      '1,350 PSN points<span class="sep">\u00b7</span>' +
      '<b>' + a.cited + '/' + a.steps + ' steps cited</b><span class="sep">\u00b7</span>' +
      '<b>' + a.backed2 + ' steps backed by 2+ sources</b><span class="sep">\u00b7</span>' +
      '<b>' + a.tr2 + '/55 guides backed by 2+ sources</b></div>';
    var row2 = '<div class="audit-row"><b>' + a.pages + ' pages \u00b7 ' + a.sites + ' sites</b> read ' + fmtDate(state.sourcesRead) + '<span class="sep">\u00b7</span>' +
      c.hidden_reported + ' PSN-hidden (' + c.hidden_identified + ' identified)<span class="sep">\u00b7</span>' +
      a.miss + ' possibly missable<span class="sep">\u00b7</span>' +
      a.watch + ' watch<span class="sep">\u00b7</span>' +
      a.unconf + ' unconfirmed<span class="sep">\u00b7</span>' +
      a.disp + ' disputes shown both ways<span class="sep">\u00b7</span>' +
      '~200 h to platinum<span class="sep">\u00b7</span>' +
      'difficulty 4/10<span class="sep">\u00b7</span>' +
      'one playthrough<span class="sep">\u00b7</span>' +
      'game launched 19 Nov 2026</div>';
    $('audit').innerHTML = row1 + row2;
  }

  function updateProgress() {
    var earned = state.trophies.filter(function (t) { return state.earned[t.id]; });
    var points = earned.reduce(function (s, t) { return s + t.psn_points; }, 0);
    var byGrade = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
    earned.forEach(function (t) { byGrade[t.grade]++; });
    $('earned-count').textContent = earned.length;
    $('pc-p').textContent = byGrade.platinum;
    $('pc-g').textContent = byGrade.gold;
    $('pc-s').textContent = byGrade.silver;
    $('pc-b').textContent = byGrade.bronze;
    $('earned-points').textContent = points;
    $('bar-fill').style.width = (state.trophies.length ? Math.round(earned.length / state.trophies.length * 100) : 0) + '%';
    var dn = $('demo-note');
    if (state.demo) { dn.hidden = false; } else { dn.hidden = true; }
  }

  /* ---------- left column ---------- */
  function chipDefs() {
    var counts = {
      all: state.trophies.length,
      story: 0, collectibles: 0, activities: 0, crime: 0, strangers: 0, misc: 0,
      missable: 0, hidden: 0, disputed: 0, unconfirmed: 0, notearned: 0,
      platinum: 0, gold: 0, silver: 0, bronze: 0
    };
    state.trophies.forEach(function (t) {
      if (t.category === 'story') counts.story++;
      if (t.category === 'collectibles') counts.collectibles++;
      if (t.category === 'activities') counts.activities++;
      if (t.category === 'crime') counts.crime++;
      if (t.category === 'strangers') counts.strangers++;
      if (t.category === 'misc') counts.misc++;
      if (t.missable) counts.missable++;
      if (t.hidden) counts.hidden++;
      if (disputesOf(t.id).length) counts.disputed++;
      if (t.method_status === 'unconfirmed') counts.unconfirmed++;
      if (!state.earned[t.id]) counts.notearned++;
      counts[t.grade]++;
    });
    return [
      ['all', 'All 55', counts.all], ['story', 'Story', counts.story],
      ['missable', 'Missable', counts.missable], ['collectibles', 'Collectibles', counts.collectibles],
      ['activities', 'Activities', counts.activities], ['crime', 'Crime', counts.crime],
      ['strangers', 'Strangers', counts.strangers], ['misc', 'Misc', counts.misc],
      ['hidden', 'PSN-hidden', counts.hidden], ['disputed', 'Disputed', counts.disputed],
      ['unconfirmed', 'Unconfirmed', counts.unconfirmed], ['notearned', 'Not earned', counts.notearned],
      ['platinum', 'Platinum', counts.platinum], ['gold', 'Gold', counts.gold],
      ['silver', 'Silver', counts.silver], ['bronze', 'Bronze', counts.bronze]
    ];
  }

  function matchesFilter(t) {
    var f = state.filter;
    if (f === 'story' && t.category !== 'story') return false;
    if (f === 'collectibles' && t.category !== 'collectibles') return false;
    if (f === 'activities' && t.category !== 'activities') return false;
    if (f === 'crime' && t.category !== 'crime') return false;
    if (f === 'strangers' && t.category !== 'strangers') return false;
    if (f === 'misc' && t.category !== 'misc') return false;
    if (f === 'missable' && !t.missable) return false;
    if (f === 'hidden' && !t.hidden) return false;
    if (f === 'disputed' && !disputesOf(t.id).length) return false;
    if (f === 'unconfirmed' && t.method_status !== 'unconfirmed') return false;
    if (f === 'notearned' && state.earned[t.id]) return false;
    if ((f === 'platinum' || f === 'gold' || f === 'silver' || f === 'bronze') && t.grade !== f) return false;
    if (state.query) {
      var d = det(t.id);
      var hay = (t.name + ' ' + t.official + ' ' + t.guide + ' ' + t.category +
        ' ' + (d ? d.inShort || '' : '') + ' ' + (d ? (d.steps || []).map(function (s) { return s.t; }).join(' ') : '')).toLowerCase();
      if (hay.indexOf(state.query) === -1) return false;
    }
    return true;
  }

  function sortedList() {
    var list = (state.sort === 'roadmap' ? state.order : state.trophies).filter(matchesFilter);
    if (state.sort === 'name') list.sort(function (a, b) { return a.name.localeCompare(b.name); });
    if (state.sort === 'grade') {
      var rank = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
      list.sort(function (a, b) { return (rank[a.grade] - rank[b.grade]) || a.name.localeCompare(b.name); });
    }
    return list;
  }

  function rowTags(t) {
    var out = '';
    if (t.hidden) out += '<span class="tag tag-hidden">HIDDEN</span>';
    if (t.missable) out += '<span class="tag tag-missable">MISSABLE</span>';
    if (disputesOf(t.id).length) out += '<span class="tag tag-disputed">DISPUTED</span>';
    var d = det(t.id);
    if (d && d.watch && !t.missable && t.method_status === 'confirmed') out += '<span class="tag tag-watch">WATCH</span>';
    if (t.method_status === 'unconfirmed') out += '<span class="tag tag-unconfirmed">UNCONFIRMED</span>';
    if (state.earned[t.id]) out += '<span class="tag tag-earned">EARNED</span>';
    return out;
  }

  function renderChips() {
    $('chips').innerHTML = chipDefs().map(function (c) {
      return '<button type="button" class="chip-btn' + (state.filter === c[0] ? ' active' : '') +
        '" data-filter="' + c[0] + '">' + esc(c[1]) + ' ' + c[2] + '</button>';
    }).join('');
  }

  function renderList() {
    var list = sortedList();
    var html = '';
    var lastStage = null;
    list.forEach(function (t) {
      if (state.sort === 'roadmap' && t.stage !== lastStage) {
        html += '<div class="stage-head">' + esc(stageName(t.stage).toUpperCase()) + '</div>';
        lastStage = t.stage;
      }
      var d = det(t.id);
      var srcCount = d ? (d.sources || []).length : 0;
      html += '<div class="trow' + (state.selected === t.id ? ' selected' : '') + (state.earned[t.id] ? ' earned' : '') +
        '" data-id="' + esc(t.id) + '">' +
        '<input type="checkbox" data-check="' + esc(t.id) + '"' + (state.earned[t.id] ? ' checked' : '') + ' aria-label="Mark earned">' +
        '<span class="grade grade-' + esc(t.grade) + '">' + esc(t.grade.charAt(0).toUpperCase()) + '</span>' +
        '<span class="tbody"><span class="tname">' + esc(t.name) + '</span> ' + rowTags(t) +
        '<span class="tmeta">' + srcCount + ' src \u00b7 ' + t.psn_points + ' pts \u00b7 ' + esc(stageName(t.stage)) + '</span></span></div>';
    });
    $('trophy-list').innerHTML = html || '<p class="empty">No trophies match these filters.</p>';
    $('shown-count').textContent = list.length + ' SHOWN';
  }

  /* ---------- centre detail ---------- */
  function renderDetail() {
    var t = byId(state.selected);
    var el = $('detail');
    if (!t) { el.innerHTML = '<p>Select a trophy on the left.</p>'; return; }
    var d = det(t.id);
    var idx = state.roadmapIdx[t.id] || (state.trophies.indexOf(t) + 1);
    var spoilerMask = t.spoiler && !state.spoilersShown;
    var html = '<div class="detail-head">' +
      '<div class="detail-kicker">TROPHY ' + idx + ' OF 55 &middot; ' + esc(stageName(t.stage).toUpperCase()) + '</div>' +
      '<h2>' + esc(t.name) + '</h2>' +
      '<div class="detail-sub"><span class="grade grade-' + esc(t.grade) + '">' + esc(gradeLabel(t.grade)) + '</span> ' +
      t.psn_points + ' PSN pts &middot; ' + esc(catLabel(t.category)) + ' &middot; ' +
      (d ? (d.sources || []).length : 0) + ' sources &middot; ' +
      (t.method_status === 'confirmed' ? 'method confirmed' : 'method unconfirmed') + '</div></div>';

    if (spoilerMask) {
      html += '<p class="spoiler-hidden">Story spoiler \u2014 hidden. Uncheck \u201cSpoiler shield\u201d at the top to reveal this trophy.</p>';
    } else {
      html += '<div class="official"><span class="lbl">OFFICIAL DESCRIPTION</span>&ldquo;' + esc(t.official) + '&rdquo;</div>';

      var badges = '';
      if (t.missable) badges += '<span class="badge badge-red">POSSIBLY MISSABLE</span>';
      if (disputesOf(t.id).length) badges += '<span class="badge badge-purple">SOURCES DIFFER \u00b7 ' + disputesOf(t.id).length + '</span>';
      if (t.method_status === 'unconfirmed') badges += '<span class="badge badge-grey">METHOD UNCONFIRMED</span>';
      if (t.hidden) badges += '<span class="badge">PSN-HIDDEN</span>';
      if (state.earned[t.id]) badges += '<span class="badge badge-green">EARNED</span>';
      if (badges) html += '<div class="badges">' + badges + '</div>';

      if (d && d.count) {
        var cur = state.counts[t.id] || 0;
        html += '<div class="count-box"><span class="count-label">YOUR COUNT</span>' +
          '<button type="button" data-count-minus="' + esc(t.id) + '" aria-label="Decrease">\u2212</button>' +
          '<span class="count-num">' + cur + '/' + d.count.total + ' ' + esc(d.count.label) + '</span>' +
          '<button type="button" data-count-plus="' + esc(t.id) + '" aria-label="Increase">+</button>' +
          '<span class="count-note">' + esc(d.count.note || '') + '</span></div>';
      }
      if (d && d.watch) {
        html += '<div class="warn"><b>WATCH:</b> ' + esc(d.watch) + '</div>';
      }
      (disputesOf(t.id)).forEach(function (dp) {
        html += '<div class="dispute"><h3>SOURCES DIFFER \u2014 ' + esc(dp.q) + '</h3>' +
          '<div class="vs"><div><b>Version A</b>' + esc(dp.a) + '</div>' +
          '<div><b>Version B</b>' + esc(dp.b) + '</div></div>' +
          '<div class="call"><b>OUR CALL:</b> ' + esc(dp.call) + '</div></div>';
      });
      if (d && d.inShort) {
        html += '<div class="detail-sec"><h3>IN SHORT</h3><p>' + esc(d.inShort) + '</p></div>';
      }
      if (d && (d.steps || []).length) {
        html += '<div class="detail-sec"><h3>HOW TO EARN IT \u2014 ' + d.steps.length + ' STEPS, ALL CITED</h3><ol class="steps">' +
          d.steps.map(function (st) {
            var c = (st.src || []).map(function (n) { return '[' + n + ']'; }).join(' ');
            return '<li>' + esc(st.t) + ' <span class="cite">' + esc(c) + '</span></li>';
          }).join('') + '</ol></div>';
      }
      html += '<div class="detail-foot">Source: ' + esc(t.source) + ', ' + esc(t.source_date) + ' \u00b7 ' +
        'Guide verified against ' + ((d && d.sources) ? d.sources.length : 0) + ' sources (see right panel).' +
        (t.method_status === 'unconfirmed' ? ' Method unconfirmed \u2014 no guide has verified it yet.' : '') + '</div>';
    }
    el.innerHTML = html;
    renderTrophySources(t);
  }

  function renderTrophySources(t) {
    var d = det(t.id);
    var list = $('srcs-list');
    $('srcs-title').textContent = 'SOURCES FOR THIS GUIDE \u00b7 ' + ((d && d.sources) ? d.sources.length : 0);
    if (!d) { list.innerHTML = ''; return; }
    list.innerHTML = (d.sources || []).map(function (n) {
      var s = src(n);
      if (!s) return '';
      return '<li><b>[' + n + ']</b> ' + esc(s.site) + ' \u2014 ' + esc(s.title) + ' \u2014 <a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.url) + '</a> <span class="cited-by">\u00b7 cited by ' + citedBy(n) + ' of 55 guides \u00b7 article ' + esc(s.date) + ' \u00b7 read ' + fmtDate(state.sourcesRead) + '</span></li>';
    }).join('');
  }

  /* ---------- right column ---------- */
  function renderNextUp() {
    var items = [];
    var pma = byId('positive-mental-attitude');
    if (pma && !state.earned[pma.id]) items.push(pma);
    state.order.forEach(function (t) {
      if (items.length >= 10) return;
      if (t.id === 'positive-mental-attitude') return;
      if (t.id === 'vice-got-a-price' || t.id === 'a-long-road') return;
      if (!state.earned[t.id]) items.push(t);
    });
    $('nextup').innerHTML = items.map(function (t) {
      var d = det(t.id);
      var n = d ? (d.sources || []).length : 0;
      var tag = t.missable ? ' <span class="tag tag-missable">MISSABLE</span>' : '';
      return '<li data-id="' + esc(t.id) + '">' + esc(t.name) + tag +
        '<span class="nu-meta"> \u2014 ' + esc(stageName(t.stage)) + ' \u00b7 ' + n + ' src</span></li>';
    }).join('');
  }

  function renderGoal() {
    var nonPlat = state.trophies.filter(function (t) { return t.id !== 'vice-got-a-price'; });
    var earnedNonPlat = nonPlat.filter(function (t) { return state.earned[t.id]; }).length;
    var pct = Math.round(earnedNonPlat / 54 * 100);
    $('goal-body').innerHTML =
      '<div class="goal-row"><b>VICE GOT A PRICE!</b> \u2014 the Platinum: ' + earnedNonPlat + '/54 trophies (' + pct + '%)' +
      '<div class="bar"><div class="bar-fill" style="width:' + pct + '%"></div></div></div>' +
      '<div class="goal-row"><b>A LONG ROAD</b> \u2014 100% completion: 0/35 checklist lines (0%)<br>' +
      '<span style="color:#6b5d43">Checklist lines are not tracked here \u2014 track them in Progress &gt; Stats &gt; 100% Completion after the story (see Roadmap tab).</span></div>' +
      '<div class="goal-row">~200 hours \u00b7 difficulty 4/10 \u00b7 one playthrough \u00b7 0 online trophies \u00b7 no difficulty trophy</div>';
  }

  /* ---------- other tabs ---------- */
  function renderRoadmap() {
    var el = $('view-roadmap');
    var html = '<h2 class="sec">ROADMAP \u2014 7 STAGES TO THE PLATINUM</h2>';
    (state.meta.stages || []).forEach(function (s) {
      var list = state.trophies.filter(function (t) { return t.stage === s.n; });
      var done = list.filter(function (t) { return state.earned[t.id]; }).length;
      html += '<div class="stage-card"><h3>STAGE ' + s.n + ' \u2014 ' + esc(s.name) + ' (' + list.length + ' trophies \u00b7 ' + done + ' earned)</h3><p>' + esc(s.tip) + '</p></div>';
    });
    html += '<h2 class="sec">A LONG ROAD \u2014 THE 100% CHECKLIST (35 REQUIREMENTS)</h2>' +
      '<p style="font-size:12px;color:#6b5d43">The checklist unlocks after the story (Progress &gt; Stats &gt; 100% Completion). Nothing is missable for 100% \u2014 everything can still be done after the story in free-roam. Source: PowerPyx [3], read 20 Nov 2026.</p>';
    Object.keys(CHECKLIST_100).forEach(function (group) {
      html += '<h2 class="sec">' + esc(group) + '</h2><ol class="checklist">' +
        CHECKLIST_100[group].map(function (item) { return '<li>' + esc(item) + '</li>'; }).join('') + '</ol>';
    });
    el.innerHTML = html;
  }

  function renderMissables() {
    var el = $('view-missables');
    var a = auditNumbers();
    var html = '<h2 class="sec">MISSABLE WATCH LIST</h2>' +
      '<div class="note-box">Only <b>1</b> trophy is possibly missable, with <b>3</b> watch items and <b>5</b> unconfirmed methods. Cheats disable trophies and achievements \u2014 do not use cheats while going for the platinum.</div>';
    var watchItems = state.trophies.filter(function (t) {
      var d = det(t.id);
      return d && d.watch;
    });
    html += '<ul class="miss-list">' + watchItems.map(function (t) {
      var d = det(t.id);
      var tag = t.missable ? 'POSSIBLY MISSABLE' : (t.method_status === 'unconfirmed' ? 'UNCONFIRMED' : 'WATCH');
      return '<li><b>' + esc(t.name) + '</b> [' + tag + '] \u2014 ' + esc(d.watch) + '</li>';
    }).join('') + '</ul>';
    html += '<h2 class="sec">HOW TO PROTECT YOURSELF</h2>' +
      '<div class="note-box">Keep a manual save at the start of Chapter 1, a second save before the final mission, and one save per chapter. Do the meditations as you go (do not leave them for the post-game). After finishing a Strangers &amp; Freaks strand, check the in-game strand counter before moving on \u2014 strands that do not count toward the 8 are easy to waste hours on.</div>';
    el.innerHTML = html;
  }

  function listCheckRole(n) {
    if (n === 15 || n === 21) return 'list check \u2014 full trophy list verified against it';
    if (n === 23) return 'list check \u2014 Down to Earth walkthrough read for verification';
    if (n === 24) return 'list check \u2014 mission-count dispute (93 missions)';
    return null;
  }

  function renderSourcesTab() {
    var el = $('view-sources');
    var html = '<h2 class="sec">SOURCES \u2014 ' + state.sources.length + ' PAGES, ' + auditNumbers().sites + ' SITES, READ ' + fmtDate(state.sourcesRead).toUpperCase() + '</h2>' +
      '<p style="font-size:12px;color:#6b5d43">Every guide step cites its source by number. The count after each source is how many of the 55 guides cite it. Sources marked \u201clist check\u201d were read to verify the full trophy list or a dispute, and are not cited on any single trophy.</p>' +
      '<ol class="src-list">' + state.sources.map(function (s) {
        var c = citedBy(s.n);
        var role = listCheckRole(s.n);
        var note = role ? '<span class="list-check">' + esc(role) + '</span>' : '<span class="cited-by">cited by ' + c + ' of 55 guides</span>';
        return '<li><b>[' + s.n + ']</b> ' + esc(s.site) + ' \u2014 ' + esc(s.title) + ' \u2014 <a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.url) + '</a> \u00b7 ' + note + ' \u00b7 article ' + esc(s.date) + ' \u00b7 read ' + fmtDate(state.sourcesRead) + '</li>';
      }).join('') + '</ol>';
    html += '<h2 class="sec">SOURCES DIFFER \u2014 GUIDE-LEVEL DISPUTES</h2>' +
      '<div class="note-box"><b>Story mission count:</b> 91 (KeenGamer [7]) vs 93 (Insider Gaming [24], Push Square chapters [28]) vs 95 (VGC [27]) vs 122 including optional missions (GTABay [26]). Our call: the main story is 91 missions; the higher counts include optional missions. The trophy does not depend on the count \u2014 finish the story.<br><br>' +
      '<b>Platinum hours:</b> ~200 h (PowerPyx [1], KeenGamer [7], GTABase [8], OutputLag [10]) vs \u201cup to 300 hours or more\u201d (Push Square [18], marked WIP). Our call: plan ~200 hours if you follow the roadmap; the 300-hour figure comes from a work-in-progress guide.<br><br>' +
      '<b>Meditations:</b> 100% completion needs 15 of 18 meditations; the Positive Mental Attitude trophy needs all 18 (Beebom [17], GameTrek [19]).</div>' +
      '<h2 class="sec">HOW WE VERIFIED THIS LIST</h2>' +
      '<div class="note-box">Names, official descriptions and grades: 55/55 match between Exophase [16] and OutputLag [10], cross-checked against the full lists on GamesFuze [15] and Mobalytics [21]. Guide paragraphs and steps: each step cites the source it comes from; steps with two or more citations are the ones where two sources independently agree. Disputes are shown both ways with our call, never hidden.</div>';
    el.innerHTML = html;
  }

  /* ---------- tabs & events ---------- */
  function showTab(tab) {
    state.tab = tab;
    document.querySelectorAll('#tabs button').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-tab') === tab);
    });
    ['tracker', 'roadmap', 'missables', 'sources'].forEach(function (t) {
      $('view-' + t).hidden = (t !== tab);
    });
    if (tab === 'roadmap') renderRoadmap();
    if (tab === 'missables') renderMissables();
    if (tab === 'sources') renderSourcesTab();
  }

  function renderAll() {
    renderAudit();
    renderChips();
    renderList();
    renderDetail();
    renderNextUp();
    renderGoal();
    updateProgress();
  }

  function readUrlParams() {
    var p = new URLSearchParams(window.location.search);
    if (p.get('tab') && ['tracker', 'roadmap', 'missables', 'sources'].indexOf(p.get('tab')) !== -1) state.tab = p.get('tab');
    if (p.get('t') && byId(p.get('t'))) state.selected = p.get('t');
    if (p.get('grade') && ['platinum', 'gold', 'silver', 'bronze'].indexOf(p.get('grade')) !== -1) state.filter = p.get('grade');
    if (p.get('spoilers') === 'show') state.spoilersShown = true;
  }

  function bindEvents() {
    $('search').addEventListener('input', function (e) { state.query = e.target.value.trim().toLowerCase(); renderList(); });
    $('sort').addEventListener('change', function (e) { state.sort = e.target.value; renderList(); });
    $('chips').addEventListener('click', function (e) {
      var f = e.target.getAttribute && e.target.getAttribute('data-filter');
      if (!f) return;
      state.filter = f; renderChips(); renderList();
    });
    $('trophy-list').addEventListener('click', function (e) {
      var chk = e.target.getAttribute && e.target.getAttribute('data-check');
      if (chk) {
        if (e.target.checked) state.earned[chk] = true; else delete state.earned[chk];
        state.demo = false;
        saveState(); renderList(); renderDetail(); renderNextUp(); renderGoal(); updateProgress();
        return;
      }
      var row = e.target.closest && e.target.closest('.trow');
      if (row) { state.selected = row.getAttribute('data-id'); renderList(); renderDetail(); }
    });
    $('nextup').addEventListener('click', function (e) {
      var li = e.target.closest && e.target.closest('li[data-id]');
      if (!li) return;
      state.selected = li.getAttribute('data-id'); renderList(); renderDetail();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    $('detail').addEventListener('click', function (e) {
      var plus = e.target.getAttribute && e.target.getAttribute('data-count-plus');
      var minus = e.target.getAttribute && e.target.getAttribute('data-count-minus');
      if (!plus && !minus) return;
      var id = plus || minus;
      var d = det(id);
      var cur = state.counts[id] || 0;
      if (plus) cur = Math.min(cur + 1, d.count.total);
      if (minus) cur = Math.max(cur - 1, 0);
      state.counts[id] = cur;
      state.demo = false;
      saveState(); renderDetail();
    });
    document.querySelectorAll('#tabs button').forEach(function (b) {
      b.addEventListener('click', function () { showTab(b.getAttribute('data-tab')); });
    });
    $('spoiler-shield').addEventListener('change', function (e) {
      state.spoilersShown = !e.target.checked; renderList(); renderDetail();
    });
    $('reset-btn').addEventListener('click', function () {
      if (!window.confirm('Clear all earned ticks and counts?')) return;
      state.earned = {}; state.counts = {}; state.demo = false;
      saveState(); renderAll();
    });
    $('export-btn').addEventListener('click', function () {
      var blob = new Blob([JSON.stringify({ exported: new Date().toISOString(), earned: Object.keys(state.earned), counts: state.counts, demo: state.demo }, null, 2)], { type: 'application/json' });
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
          (ids || []).forEach(function (id) { next[id] = true; });
          state.earned = next;
          state.counts = (data && data.counts) || {};
          state.demo = false;
          saveState(); renderAll();
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
  ]).then(function (res) {
    state.meta = res[0].meta;
    state.trophies = res[0].trophies;
    state.order = state.trophies.map(function (t, i) { return { t: t, i: i }; })
      .sort(function (a, b) { return (a.t.stage - b.t.stage) || (a.i - b.i); })
      .map(function (x) { return x.t; });
    state.roadmapIdx = {};
    state.order.forEach(function (t, i) { state.roadmapIdx[t.id] = i + 1; });
    state.details = {};
    res[1].trophies.forEach(function (d) { state.details[d.id] = d; });
    state.sources = res[2].sources;
    state.sourcesRead = res[2].read || '2026-11-20';
    loadState();
    readUrlParams();
    $('spoiler-shield').checked = !state.spoilersShown;
    renderAll();
    showTab(state.tab);
    bindEvents();
  }).catch(function (err) {
    $('detail').innerHTML = '<p>Could not load the trophy data (' + esc(err.message) + '). Serve app/ over HTTP and try again.</p>';
  });
})();
