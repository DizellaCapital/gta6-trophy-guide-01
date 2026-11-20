/* Leonida Trophy Guide & Tracker — renders app/data/trophies.json, keeps earned
   ticks in localStorage, and filters without any network calls. */
(function () {
  'use strict';

  var STORE_KEY = 'leonida-tracker-v1';
  var DATA_URL = 'data/trophies.json';

  var state = {
    trophies: [],
    meta: null,
    earned: {},
    spoilersShown: false,
    query: '',
    grade: '',
    stage: '',
    status: '',
  };

  function $(id) { return document.getElementById(id); }

  function loadEarned() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      state.earned = raw ? JSON.parse(raw) : {};
    } catch (e) { state.earned = {}; }
  }

  function saveEarned() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state.earned)); } catch (e) { /* storage full or blocked: progress just won't persist */ }
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function gradeLabel(g) { return g.charAt(0).toUpperCase() + g.slice(1); }

  function stageName(n) {
    var s = (state.meta && state.meta.stages || []).find(function (x) { return x.n === n; });
    return s ? 'Stage ' + n + ' — ' + s.name : 'Stage ' + n;
  }

  function matches(t) {
    if (state.grade && t.grade !== state.grade) return false;
    if (state.stage && String(t.stage) !== String(state.stage)) return false;
    if (state.status === 'earned' && !state.earned[t.id]) return false;
    if (state.status === 'remaining' && state.earned[t.id]) return false;
    if (state.status === 'missable' && !t.missable) return false;
    if (state.status === 'unconfirmed' && t.method_status === 'confirmed') return false;
    if (state.query) {
      var hay = (t.name + ' ' + t.official + ' ' + t.guide + ' ' + t.category).toLowerCase();
      if (hay.indexOf(state.query) === -1) return false;
    }
    return true;
  }

  function cardHtml(t) {
    var earned = !!state.earned[t.id];
    var spoilerMask = t.spoiler && !state.spoilersShown;
    var chips = '<span class="chip">' + esc(stageName(t.stage)) + '</span>' +
      '<span class="chip points">' + t.psn_points + ' PSN pts</span>';
    if (t.missable) chips += '<span class="chip missable">Possibly missable</span>';
    if (t.hidden) chips += '<span class="chip hidden-t">Hidden</span>';
    if (t.target) chips += '<span class="chip">Target: ' + esc(String(t.target)) + ' ' + esc(t.target_unit || '') + '</span>';
    var method = t.method_status === 'confirmed'
      ? '<span class="flag-confirmed">method confirmed</span>'
      : '<span class="flag-unconfirmed">method unconfirmed</span>';
    var body = spoilerMask
      ? '<p class="spoiler-note">Story spoiler — hidden. Use the “Spoilers” button above to reveal.</p>'
      : '<p class="official">&ldquo;' + esc(t.official) + '&rdquo;</p>' +
        '<p class="guide">' + esc(t.guide) + '</p>';
    return '<article class="card' + (earned ? ' earned' : '') + '" data-id="' + esc(t.id) + '">' +
      '<div class="card-top"><h3>' + esc(t.name) + '</h3>' +
      '<span class="grade grade-' + esc(t.grade) + '">' + esc(gradeLabel(t.grade)) + '</span></div>' +
      '<div class="chips">' + chips + '</div>' +
      '<div class="' + (spoilerMask ? 'spoiler-hidden' : '') + '">' + body + '</div>' +
      '<div class="card-foot"><span class="src">Source: ' + esc(t.source) + ', ' + esc(t.source_date) + '</span>' + method + '</div>' +
      '<label class="check"><input type="checkbox" data-check="' + esc(t.id) + '"' + (earned ? ' checked' : '') + '> Earned</label>' +
      '</article>';
  }

  function render() {
    var grid = $('grid');
    var list = state.trophies.filter(matches);
    grid.innerHTML = list.length
      ? list.map(cardHtml).join('')
      : '<p class="empty">No trophies match these filters. Clear the search or widen the grade / stage.</p>';
    $('count-line').textContent = 'Showing ' + list.length + ' of ' + state.trophies.length + ' trophies.';
    updateProgress();
  }

  function updateProgress() {
    var earnedList = state.trophies.filter(function (t) { return state.earned[t.id]; });
    var points = earnedList.reduce(function (s, t) { return s + t.psn_points; }, 0);
    var total = state.trophies.length;
    var pct = total ? Math.round(earnedList.length / total * 100) : 0;
    $('earned-count').textContent = earnedList.length;
    $('earned-points').textContent = points;
    $('progress-pct').textContent = pct + '%';
    $('bar-fill').style.width = pct + '%';
  }

  function renderStages() {
    var stages = (state.meta && state.meta.stages) || [];
    $('stages').innerHTML = stages.map(function (s) {
      var count = state.trophies.filter(function (t) { return t.stage === s.n; }).length;
      var done = state.trophies.filter(function (t) { return t.stage === s.n && state.earned[t.id]; }).length;
      return '<li><span class="stage-meta">STAGE ' + s.n + ' &middot; ' + count + ' trophies &middot; ' + done + ' earned</span>' +
        '<b>' + esc(s.name) + '</b><p>' + esc(s.tip) + '</p></li>';
    }).join('');
  }

  function renderSources() {
    var srcs = (state.meta && state.meta.sources) || [];
    $('source-list').innerHTML = srcs.map(function (s) {
      return '<li>' + esc(s.name) + ' — ' + esc(s.date) + ' — <a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.url) + '</a></li>';
    }).join('');
  }

  function readUrlParams() {
    var p = new URLSearchParams(window.location.search);
    if (p.get('grade')) { state.grade = p.get('grade'); $('filter-grade').value = state.grade; }
    if (p.get('stage')) { state.stage = p.get('stage'); $('filter-stage').value = state.stage; }
    if (p.get('q')) { state.query = p.get('q').toLowerCase(); $('search').value = p.get('q'); }
    if (p.get('spoilers') === 'show') { state.spoilersShown = true; }
  }

  function syncSpoilerButton() {
    var b = $('toggle-spoilers');
    b.textContent = state.spoilersShown ? 'Spoilers: shown' : 'Spoilers: hidden';
    b.setAttribute('aria-pressed', String(state.spoilersShown));
  }

  function bindEvents() {
    $('search').addEventListener('input', function (e) { state.query = e.target.value.trim().toLowerCase(); render(); });
    $('filter-grade').addEventListener('change', function (e) { state.grade = e.target.value; render(); });
    $('filter-stage').addEventListener('change', function (e) { state.stage = e.target.value; render(); });
    $('filter-status').addEventListener('change', function (e) { state.status = e.target.value; render(); });
    $('toggle-spoilers').addEventListener('click', function () { state.spoilersShown = !state.spoilersShown; syncSpoilerButton(); render(); });
    $('grid').addEventListener('change', function (e) {
      var id = e.target.getAttribute && e.target.getAttribute('data-check');
      if (!id) return;
      if (e.target.checked) state.earned[id] = true; else delete state.earned[id];
      saveEarned();
      render();
      renderStages();
    });
    $('reset-btn').addEventListener('click', function () {
      if (!window.confirm('Clear all earned ticks?')) return;
      state.earned = {};
      saveEarned();
      render();
      renderStages();
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
          saveEarned();
          render();
          renderStages();
        } catch (err) { window.alert('That file is not valid tracker JSON.'); }
      };
      reader.readAsText(f);
      e.target.value = '';
    });
  }

  fetch(DATA_URL)
    .then(function (r) { if (!r.ok) throw new Error('trophies.json failed: ' + r.status); return r.json(); })
    .then(function (data) {
      state.meta = data.meta;
      state.trophies = data.trophies;
      loadEarned();
      readUrlParams();
      syncSpoilerButton();
      renderStages();
      renderSources();
      render();
      bindEvents();
    })
    .catch(function (err) {
      $('grid').innerHTML = '<p class="empty">Could not load the trophy list (' + esc(err.message) + '). Serve app/ over HTTP and try again.</p>';
    });
})();
