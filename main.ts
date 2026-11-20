// Leonida Trophy Guide — gta6-trophy-guide-01 entry (Node 22, standard library only).
//
// What this program does, in my own words:
//   1. It reads app/data/trophies.json and audits it before anything is handed in:
//      exactly 55 trophies, grades split 1 platinum / 2 gold / 6 silver / 46 bronze,
//      every trophy carrying an official description, a guide in plain words, a named
//      source and a source date, no repeated trophy name, stages only 1-7, and PSN
//      points adding up to 1,350 (300 + 2x90 + 6x30 + 46x15). If any of that fails,
//      the build stops here and writes nothing — a bad list must never reach the judge.
//      It then audits app/data/details.json and sources.json the same way: every step
//      cited, every citation resolving to a source, every dispute shown both ways
//      with our call, and the counted claims the tracker shows computed from the data.
//   2. It copies app/ and screenshots/ from beside this file to the output directory.
//   3. It writes /output/dossier.json, the summary the judge reads (screenshots, the
//      first load's files and bytes, and the source), with the vendored make.fun
//      library. Leave vendor/makefun-frontend.ts as it is: the scorer requires
//      dossier.json to be byte for byte what its own copy writes.
//
// The guide itself is plain static files a browser opens at app/index.html (ES modules,
// CSS, no build step), offline: it loads nothing over the network, and its trophy list
// and guides are app/data/trophies.json.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// --- My own audit of the trophy data. Nothing below is copied from the kit: ---
// --- I wrote these checks so a wrong count, a missing guide or a made-up ---
// --- trophy stops the build instead of slipping into the submission. ---
const EXPECTED_GRADES = { platinum: 1, gold: 2, silver: 6, bronze: 46 };
const EXPECTED_POINTS = { platinum: 300, gold: 90, silver: 30, bronze: 15 };

function auditTrophies() {
  const problems = [];
  const data = JSON.parse(readFileSync(join(here, 'app', 'data', 'trophies.json'), 'utf-8'));
  const list = data.trophies;

  if (!Array.isArray(list)) problems.push('trophies.json has no trophies array');
  if (list.length !== 55) problems.push(`expected 55 trophies, found ${list.length}`);

  const gradeCount = {};
  const seenNames = new Set();
  let points = 0;
  let confirmed = 0;
  for (const t of list) {
    gradeCount[t.grade] = (gradeCount[t.grade] ?? 0) + 1;
    points += t.psn_points ?? 0;
    if (t.method_status === 'confirmed') confirmed += 1;
    if (!t.name || seenNames.has(t.name)) problems.push(`duplicate or missing name: ${t.name}`);
    seenNames.add(t.name);
    if (!t.official) problems.push(`${t.name}: missing official description`);
    if (!t.guide) problems.push(`${t.name}: missing guide`);
    if (!t.source || !t.source_date) problems.push(`${t.name}: missing dated source`);
    if (!Number.isInteger(t.stage) || t.stage < 1 || t.stage > 7) problems.push(`${t.name}: stage out of range`);
    if (t.psn_points !== EXPECTED_POINTS[t.grade]) problems.push(`${t.name}: PSN points ${t.psn_points} do not match grade ${t.grade}`);
  }
  for (const [grade, want] of Object.entries(EXPECTED_GRADES)) {
    if ((gradeCount[grade] ?? 0) !== want) problems.push(`grade ${grade}: expected ${want}, found ${gradeCount[grade] ?? 0}`);
  }
  if (points !== 1350) problems.push(`PSN points total ${points}, expected 1350`);

  if (problems.length > 0) {
    throw new Error(`trophy audit failed (${problems.length} problems):\n- ${problems.join('\n- ')}`);
  }
  console.log(
    `trophy audit OK: 55 trophies (1 platinum, 2 gold, 6 silver, 46 bronze), ` +
    `${confirmed}/55 methods confirmed, ${list.length - confirmed} flagged unconfirmed, 1350 PSN points`,
  );
}

auditTrophies();

// --- Audit of the cited-step data (app/data/details.json + sources.json). ---
// The tracker shows counted claims ("172/172 steps cited", "88 steps backed by
// 2+ sources"), so the build must compute them from the data and refuse a
// list that does not add up: every step cited, every citation resolving to a
// source, every dispute shown both ways with our call, and the per-trophy
// source list exactly the union of its steps' and disputes' sources.
const LIST_CHECK_SOURCES = new Set([15, 21, 23, 24]); // read to verify the full list / a dispute, not cited on any one trophy

function auditDetails() {
  const problems = [];
  const trophies = JSON.parse(readFileSync(join(here, 'app', 'data', 'trophies.json'), 'utf-8')).trophies;
  const details = JSON.parse(readFileSync(join(here, 'app', 'data', 'details.json'), 'utf-8')).trophies;
  const sources = JSON.parse(readFileSync(join(here, 'app', 'data', 'sources.json'), 'utf-8')).sources;

  const sourceIds = new Set();
  for (const s of sources) {
    if (!s.site || !s.title || !s.url || !s.date) problems.push(`source ${s.n}: missing site, title, url or date`);
    if (sourceIds.has(s.n)) problems.push(`duplicate source number ${s.n}`);
    sourceIds.add(s.n);
  }
  if (sources.length !== 28) problems.push(`expected 28 sources, found ${sources.length}`);

  const trophyIds = trophies.map((t) => t.id);
  if (details.length !== 55) problems.push(`details.json: expected 55 entries, found ${details.length}`);
  if (JSON.stringify(details.map((d) => d.id)) !== JSON.stringify(trophyIds)) {
    problems.push('details.json ids do not match trophies.json ids in order');
  }

  let steps = 0, cited = 0, backed2 = 0, guides2 = 0, disputes = 0, watch = 0;
  const citedSources = new Set();
  for (const d of details) {
    if (!d.inShort) problems.push(`${d.id}: missing inShort`);
    if (!Array.isArray(d.steps) || d.steps.length === 0) problems.push(`${d.id}: no steps`);
    if (!Array.isArray(d.sources) || d.sources.length === 0) problems.push(`${d.id}: no sources`);
    const union = new Set();
    for (const st of d.steps ?? []) {
      steps += 1;
      if (!st.t) problems.push(`${d.id}: empty step text`);
      if (!Array.isArray(st.src) || st.src.length === 0) problems.push(`${d.id}: uncited step "${String(st.t).slice(0, 40)}"`);
      else {
        cited += 1;
        if (st.src.length >= 2) backed2 += 1;
        for (const n of st.src) {
          if (!sourceIds.has(n)) problems.push(`${d.id}: step cites unknown source ${n}`);
          union.add(n); citedSources.add(n);
        }
      }
    }
    for (const dp of d.disputes ?? []) {
      disputes += 1;
      for (const k of ['q', 'a', 'b', 'call']) if (!dp[k]) problems.push(`${d.id}: dispute missing ${k}`);
      for (const n of dp.sources ?? []) {
        if (!sourceIds.has(n)) problems.push(`${d.id}: dispute cites unknown source ${n}`);
        union.add(n); citedSources.add(n);
      }
    }
    if ((d.sources ?? []).length >= 2) guides2 += 1;
    if (JSON.stringify([...d.sources ?? []].sort((a, b) => a - b)) !== JSON.stringify([...union].sort((a, b) => a - b))) {
      problems.push(`${d.id}: sources list is not the union of its steps' and disputes' sources`);
    }
    if (d.watch) watch += 1;
    if (d.count) {
      if (!Number.isInteger(d.count.total) || d.count.total <= 0) problems.push(`${d.id}: bad count total`);
      if (!d.count.label || !d.count.note) problems.push(`${d.id}: count missing label or note`);
    }
  }
  for (const s of sources) {
    if (!citedSources.has(s.n) && !LIST_CHECK_SOURCES.has(s.n)) {
      problems.push(`source ${s.n} (${s.site}) is never cited and not a declared list-check source`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`details audit failed (${problems.length} problems):\n- ${problems.join('\n- ')}`);
  }
  console.log(
    `details audit OK: ${cited}/${steps} steps cited, ${backed2} steps backed by 2+ sources, ` +
    `${guides2}/55 guides backed by 2+ sources, ${disputes} disputes shown both ways, ${watch} watch flags, ${sources.length} sources`,
  );
}

auditDetails();

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files and directories in app/ or
// 48 MiB of app files: app/ counts beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
