// Leonida Trophy Guide & Tracker — static, offline, localStorage only.
const KEY = 'gta6-trophy-guide-v1';
const $ = (id) => document.getElementById(id);

const STAGES = {
  1: ['Story', 'Opening mission, 4 chapters, final mission + 6 story missions. Unmissable.'],
  2: ['Strangers & Freaks', 'Finish the stranger strands: Andy, Kenton, Billy, Randy, Tyrone + 8 strands total.'],
  3: ['Activities & skills', 'Stunts, shooting range, drone races, races, fishing, arcade, meditation, hunting.'],
  4: ['Crime & chaos', 'Partner robberies, vaults, armored truck, jewelry store, gangs, Combat Focus.'],
  5: ['Collectibles & exploration', 'Card sets, WAiNK scans, vehicles, explore all of Leonida.'],
  6: ['Money & misc', 'Launder $250k, spend $100k, buy 8 garages, register 10 vehicles + odd jobs.'],
  7: ['Platinum', 'A Long Road (100% completion) then Vice Got a Price! pops.'],
};

let data = null;
let earned = new Set();
try { earned = new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { earned = new Set(); }
const save = () => localStorage.setItem(KEY, JSON.stringify([...earned]));

function stageStats() {
  const out = {};
  for (const t of data.trophies) {
    out[t.stage] = out[t.stage] || { total: 0, got: 0, points: 0, ptsGot: 0 };
    out[t.stage].total++;
    out[t.stage].points += t.points;
    if (earned.has(t.id)) { out[t.stage].got++; out[t.stage].ptsGot += t.points; }
  }
  return out;
}

function renderStages() {
  const s = stageStats();
  $('stages').innerHTML = Object.keys(STAGES).map((n) => {
    const st = s[n] || { total: 0, got: 0, points: 0, ptsGot: 0 };
    return `<li><span class="chip">STAGE ${n}</span><b>${STAGES[n][0]} — ${st.got}/${st.total} earned · ${st.ptsGot}/${st.points} pts</b><span>${STAGES[n][1]}</span></li>`;
  }).join('');
}

function renderSources() {
  $('sources').innerHTML = data.sources.map((x) =>
    `<li><a href="${x.url}" target="_blank" rel="noopener">${x.name}</a> — ${x.date}</li>`).join('');
}

function methodTag(t) {
  if (t.method_status === 'confirmed') return '<span class="tag confirm">method confirmed</span>';
  if (t.method_status === 'partial') return '<span class="tag partial">method partial — see guide</span>';
  return '<span class="tag unconf">method unconfirmed</span>';
}

function card(t) {
  const got = earned.has(t.id);
  const hideSpoiler = $('spoiler').checked && t.spoiler && !got;
  const body = hideSpoiler
    ? `<p class="hidden-spoiler">Hidden story trophy — tick &ldquo;earned&rdquo; below to reveal it, or uncheck &ldquo;Hide story spoilers&rdquo; above. No story details shown.</p>`
    : `<p class="desc">&ldquo;${t.description}&rdquo;</p><p class="guide">${t.guide}</p>`;
  return `<article class="trophy ${got ? 'earned' : ''} ${t.missable ? 'missable' : ''}" data-id="${t.id}">
    <div class="top"><h3>${t.id}. ${t.name}</h3><span class="badge ${t.grade}">${t.grade} · ${t.points} pts</span></div>
    ${body}
    <div class="meta"><span>Stage ${t.stage} · ${STAGES[t.stage][0]}</span><span>${t.category}</span>${t.missable ? '<span class="tag miss">MISSABLE — do early</span>' : ''}${methodTag(t)}<span>Source: ${t.source}, ${t.source_date}</span></div>
    <label class="earn"><input type="checkbox" data-earn="${t.id}" ${got ? 'checked' : ''}> Earned</label>
  </article>`;
}

function render() {
  const q = $('search').value.trim().toLowerCase();
  const grade = $('grade').value, cat = $('category').value, stage = $('stage').value;
  const onlyUn = $('onlyUnconfirmed').checked, hideEarned = $('hideEarned').checked;
  const list = data.trophies.filter((t) => {
    if (grade !== 'all' && t.grade !== grade) return false;
    if (cat !== 'all' && t.category !== cat) return false;
    if (stage !== 'all' && String(t.stage) !== stage) return false;
    if (onlyUn && t.method_status === 'confirmed') return false;
    if (hideEarned && earned.has(t.id)) return false;
    if (q && !(t.name + ' ' + t.description + ' ' + t.guide).toLowerCase().includes(q)) return false;
    return true;
  });
  $('list').innerHTML = list.map(card).join('') || '<p class="muted">No trophies match these filters.</p>';
  $('countLine').textContent = `Showing ${list.length} of 55 trophies · ${data.trophies.filter((t) => t.method_status !== 'confirmed').length} need method confirmation (5 unconfirmed + 1 partial) · 1 missable`;
  const total = data.trophies.length;
  const pts = data.trophies.reduce((a, t) => a + (earned.has(t.id) ? t.points : 0), 0);
  $('progressText').textContent = `${earned.size} of ${total} earned · ${pts} / ${data.points_total} PSN points`;
  $('progressPct').textContent = Math.round((earned.size / total) * 100) + '%';
  $('barFill').style.width = (earned.size / total) * 100 + '%';
  const gc = {};
  for (const t of data.trophies) gc[t.grade] = gc[t.grade] || [0, 0], gc[t.grade][1]++, gc[t.grade][0] += earned.has(t.id) ? 1 : 0;
  $('gradeCounts').textContent = `Platinum ${gc.platinum?.[0] || 0}/1 · Gold ${gc.gold?.[0] || 0}/2 · Silver ${gc.silver?.[0] || 0}/6 · Bronze ${gc.bronze?.[0] || 0}/46`;
  renderStages();
}

function exportProgress() {
  const blob = new Blob([JSON.stringify({ game: 'Grand Theft Auto VI', exported: new Date().toISOString(), earned: [...earned].sort((a, b) => a - b) }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importProgress(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const j = JSON.parse(r.result);
      const ids = Array.isArray(j) ? j : j.earned;
      if (!Array.isArray(ids)) throw new Error('no earned array');
      earned = new Set(ids.filter((n) => Number.isInteger(n) && n >= 1 && n <= 55));
      save(); render();
    } catch { alert('Import failed: not a valid progress file.'); }
  };
  r.readAsText(file);
}

async function main() {
  const res = await fetch('data/trophies.json');
  data = await res.json();
  // URL params (used by screenshots + deep links): ?grade=silver&stage=3&spoiler=hide&scroll=1400
  const p = new URLSearchParams(location.search);
  if (p.get('grade')) $('grade').value = p.get('grade');
  if (p.get('category')) $('category').value = p.get('category');
  if (p.get('stage')) $('stage').value = p.get('stage');
  if (p.get('spoiler') === 'hide') $('spoiler').checked = true;
  if (p.get('hideEarned') === '1') $('hideEarned').checked = true;
  if (p.get('onlyUnconfirmed') === '1') $('onlyUnconfirmed').checked = true;
  renderSources();
  render();
  for (const id of ['search', 'grade', 'category', 'stage', 'spoiler', 'hideEarned', 'onlyUnconfirmed']) {
    $(id).addEventListener('input', render);
    $(id).addEventListener('change', render);
  }
  $('list').addEventListener('change', (e) => {
    const id = Number(e.target.dataset.earn);
    if (!id) return;
    if (e.target.checked) earned.add(id); else earned.delete(id);
    save(); render();
  });
  $('export').addEventListener('click', exportProgress);
  $('import').addEventListener('change', (e) => { if (e.target.files[0]) importProgress(e.target.files[0]); });
  $('reset').addEventListener('click', () => { if (confirm('Clear all earned trophies?')) { earned.clear(); save(); render(); } });
  const scroll = Number(p.get('scroll'));
  if (p.get('view') === 'list') document.body.classList.add('list-only');
  if (p.get('view') === 'roadmap') document.body.classList.add('view-roadmap');
  if (p.get('focus') === 'list') document.getElementById('list').scrollIntoView();
  else if (p.get('focus') === 'roadmap') document.getElementById('roadmap').scrollIntoView();
  else if (Number.isFinite(scroll) && scroll > 0) window.scrollTo(0, scroll);
}
main();
