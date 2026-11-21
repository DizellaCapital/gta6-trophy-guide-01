// Leonida Trophy Guide — gta6-trophy-guide-01 (re-record 4).
// Node 22, standard library only. No network, no build step.
//
// Pipeline, in order:
//   1. Load app/data/trophies.json and prove the list is sound: 55 entries,
//      grades 1 platinum / 2 gold / 6 silver / 46 bronze, PSN points 300/90/30/15
//      per grade adding to 1,350, every entry with an official description, a
//      guide paragraph, a named source with a date, a stage 1-7, no repeated
//      name, and 7 roadmap stages. Anything off stops the run here.
//   2. Load app/data/details.json + app/data/sources.json and prove the cited
//      steps are sound: 55 entries in trophy order, 173 steps, every step
//      citing at least one of the 28 sources, 102 steps backed by 2+ sources,
//      52 of 55 guides backed by 2+ sources (the other 3 are the unconfirmed
//      methods, single-source by design), 7 disputes each with both versions
//      and our call, 9 watch flags, 1 missable, 5 unconfirmed, and every
//      entry's cited_by exactly the union of its steps' and disputes'
//      source numbers.
//   3. Copy app/ and screenshots/ into the output directory and write
//      /output/dossier.json with the vendored make.fun library — vendor/ is
//      untouched, the scorer requires its bytes to be its own.
// Serve the app locally with `node serve.ts` (http://localhost:8080).
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const GRADE_SPLIT = { platinum: 1, gold: 2, silver: 6, bronze: 46 };
const POINTS_BY_GRADE = { platinum: 300, gold: 90, silver: 30, bronze: 15 };
const TOTAL_TROPHIES = 55;
const TOTAL_POINTS = 1350;
const TOTAL_STEPS = 173;
const STEPS_BACKED_TWO = 102;
const GUIDES_BACKED_TWO = 52;
const TOTAL_DISPUTES = 7;
const TOTAL_WATCH = 9;
const TOTAL_MISSABLE = 1;
const TOTAL_UNCONFIRMED = 5;
const TOTAL_SOURCES = 28;

function readJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), 'utf-8'));
}

function stop(problems, label) {
  throw new Error(`${label} failed (${problems.length} problem${problems.length === 1 ? '' : 's'}):\n- ${problems.join('\n- ')}`);
}

// --- Trophy list audit -------------------------------------------------
function checkTrophies() {
  const found = [];
  const doc = readJson(join('app', 'data', 'trophies.json'));
  const list = doc.trophies;
  const stages = doc.stages;

  if (!Array.isArray(list)) found.push('trophies.json: no trophies list');
  if (!Array.isArray(stages) || stages.length !== 7) found.push(`expected 7 roadmap stages, found ${Array.isArray(stages) ? stages.length : 'none'}`);
  if (Array.isArray(list) && list.length !== TOTAL_TROPHIES) found.push(`expected ${TOTAL_TROPHIES} trophies, found ${list.length}`);

  const perGrade = {};
  const names = new Set();
  let points = 0;
  let confirmed = 0;
  for (const trophy of list ?? []) {
    perGrade[trophy.grade] = (perGrade[trophy.grade] ?? 0) + 1;
    points += trophy.points ?? 0;
    if (trophy.method === 'confirmed') confirmed += 1;
    if (!trophy.name) found.push('trophy with no name');
    if (names.has(trophy.name)) found.push(`repeated trophy name: ${trophy.name}`);
    names.add(trophy.name);
    if (!trophy.official) found.push(`${trophy.id}: no official description`);
    if (!trophy.guide) found.push(`${trophy.id}: no guide paragraph`);
    if (!trophy.source || !trophy.source_date) found.push(`${trophy.id}: no dated source`);
    if (!Number.isInteger(trophy.stage) || trophy.stage < 1 || trophy.stage > 7) found.push(`${trophy.id}: stage ${trophy.stage} out of 1-7`);
    if (trophy.points !== POINTS_BY_GRADE[trophy.grade]) found.push(`${trophy.id}: ${trophy.points} points does not match grade ${trophy.grade}`);
    if (trophy.goal !== undefined && (!Number.isFinite(trophy.goal) || !trophy.goal_unit)) found.push(`${trophy.id}: goal without a unit`);
  }
  for (const [grade, want] of Object.entries(GRADE_SPLIT)) {
    if ((perGrade[grade] ?? 0) !== want) found.push(`grade ${grade}: expected ${want}, found ${perGrade[grade] ?? 0}`);
  }
  if (points !== TOTAL_POINTS) found.push(`PSN points total ${points}, expected ${TOTAL_POINTS}`);

  if (found.length) stop(found, 'trophy audit');
  console.log(
    `trophy audit OK: ${TOTAL_TROPHIES} trophies (1 platinum, 2 gold, 6 silver, 46 bronze), ` +
    `${confirmed}/${TOTAL_TROPHIES} methods confirmed, ${TOTAL_POINTS} PSN points, 7 stages`,
  );
  return list.map((t) => t.id);
}

// --- Cited-steps audit ---------------------------------------------------
function checkDetails(trophyIds) {
  const found = [];
  const doc = readJson(join('app', 'data', 'details.json'));
  const sources = readJson(join('app', 'data', 'sources.json'));
  const entries = doc.entries;
  const sourceTotal = sources.sources?.length;

  if (!Array.isArray(entries)) found.push('details.json: no entries list');
  if (Array.isArray(entries) && entries.length !== TOTAL_TROPHIES) found.push(`expected ${TOTAL_TROPHIES} detail entries, found ${entries.length}`);
  if (sourceTotal !== TOTAL_SOURCES) found.push(`expected ${TOTAL_SOURCES} sources, found ${sourceTotal}`);

  let steps = 0;
  let cited = 0;
  let backedSteps = 0;
  let backedGuides = 0;
  let disputes = 0;
  let watch = 0;
  let missable = 0;
  let unconfirmed = 0;
  (entries ?? []).forEach((entry, i) => {
    if (entry.id !== trophyIds[i]) found.push(`details entry ${i}: id ${entry.id} does not match trophy ${trophyIds[i]}`);
    const used = new Set();
    let entryBacked = false;
    for (const step of entry.steps ?? []) {
      steps += 1;
      if (!step.text) found.push(`${entry.id}: step with no text`);
      if (!Array.isArray(step.src) || step.src.length === 0) {
        found.push(`${entry.id}: step with no citation`);
        continue;
      }
      cited += 1;
      if (step.src.length >= 2) { backedSteps += 1; entryBacked = true; }
      for (const n of step.src) {
        if (!Number.isInteger(n) || n < 1 || n > TOTAL_SOURCES) found.push(`${entry.id}: step cites out-of-range source ${n}`);
        used.add(n);
      }
    }
    if (entryBacked) backedGuides += 1;
    for (const dispute of entry.disputes ?? []) {
      disputes += 1;
      if (!dispute.q || !dispute.a || !dispute.b || !dispute.call) found.push(`${entry.id}: dispute missing q/a/b/call`);
      if (!Array.isArray(dispute.sources) || dispute.sources.length === 0) found.push(`${entry.id}: dispute with no sources`);
      for (const n of dispute.sources ?? []) used.add(n);
    }
    const declared = [...(entry.cited_by ?? [])].sort((a, b) => a - b);
    const actual = [...used].sort((a, b) => a - b);
    if (JSON.stringify(declared) !== JSON.stringify(actual)) {
      found.push(`${entry.id}: cited_by is not the exact union of steps + disputes`);
    }
    if (entry.flags?.watch) watch += 1;
    if (entry.flags?.missable) missable += 1;
    if (entry.flags?.unconfirmed) unconfirmed += 1;
  });
  if (steps !== TOTAL_STEPS) found.push(`expected ${TOTAL_STEPS} steps, found ${steps}`);
  if (cited !== TOTAL_STEPS) found.push(`expected ${TOTAL_STEPS}/${TOTAL_STEPS} steps cited, found ${cited}`);
  if (backedSteps !== STEPS_BACKED_TWO) found.push(`expected ${STEPS_BACKED_TWO} steps backed by 2+ sources, found ${backedSteps}`);
  if (backedGuides !== GUIDES_BACKED_TWO) found.push(`expected ${GUIDES_BACKED_TWO}/55 guides backed by 2+ sources, found ${backedGuides}`);
  if (disputes !== TOTAL_DISPUTES) found.push(`expected ${TOTAL_DISPUTES} disputes, found ${disputes}`);
  if (watch !== TOTAL_WATCH) found.push(`expected ${TOTAL_WATCH} watch flags, found ${watch}`);
  if (missable !== TOTAL_MISSABLE) found.push(`expected ${TOTAL_MISSABLE} missable, found ${missable}`);
  if (unconfirmed !== TOTAL_UNCONFIRMED) found.push(`expected ${TOTAL_UNCONFIRMED} unconfirmed, found ${unconfirmed}`);

  if (found.length) stop(found, 'details audit');
  console.log(
    `details audit OK: ${TOTAL_STEPS}/${TOTAL_STEPS} steps cited, ${STEPS_BACKED_TWO} backed by 2+ sources, ` +
    `${GUIDES_BACKED_TWO}/55 guides backed by 2+, ${TOTAL_DISPUTES} disputes, ${TOTAL_WATCH} watch, ` +
    `${TOTAL_MISSABLE} missable, ${TOTAL_UNCONFIRMED} unconfirmed, ${TOTAL_SOURCES} sources`,
  );
}

// --- Build ---------------------------------------------------------------
const ids = checkTrophies();
checkDetails(ids);

mkdirSync(OUT_DIR, { recursive: true });
cpSync(join(ROOT, 'app'), join(OUT_DIR, 'app'), { recursive: true });
mkdirSync(join(OUT_DIR, 'screenshots'), { recursive: true });
if (existsSync(join(ROOT, 'screenshots'))) cpSync(join(ROOT, 'screenshots'), join(OUT_DIR, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files and directories in app/
// or 48 MiB of app files: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(OUT_DIR, 'dossier.json'),
  buildDossier(OUT_DIR, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
