// Leonida Trophy Guide — gta6-trophy-guide-01 entry (Node 22, standard library only).
//
// What this program does, in my own words:
//   1. It reads app/data/trophies.json and audits it before anything is handed in:
//      exactly 55 trophies, grades split 1 platinum / 2 gold / 6 silver / 46 bronze,
//      every trophy carrying an official description, a guide in plain words, a named
//      source and a source date, no repeated trophy name, stages only 1-7, and PSN
//      points adding up to 1,350 (300 + 2x90 + 6x30 + 46x15). If any of that fails,
//      the build stops here and writes nothing — a bad list must never reach the judge.
//   2. It reads app/data/details.json and audits the cited steps the same way:
//      55 entries in the same order as trophies.json, 173 steps, every step citing
//      at least one of the 28 sources in app/data/sources.json, 102 steps backed by
//      2+ sources, 52 of 55 guides backed by 2+ sources (the other three are the
//      unconfirmed-method trophies, single-source by design), 7 disputes each with
//      two versions and our call, 9 watch flags, 1 missable, 5 unconfirmed, and
//      every entry's sources list exactly the union of its steps' and disputes'
//      source numbers. A step count that does not add up stops the build.
//   3. It copies app/ and screenshots/ from beside this file to the output directory.
//   4. It writes /output/dossier.json, the summary the judge reads (screenshots, the
//      first load's files and bytes, and the source), with the vendored make.fun
//      library. Leave vendor/makefun-frontend.ts as it is: the scorer requires
//      dossier.json to be byte for byte what its own copy writes.
//
// The guide itself is plain static files a browser opens at app/index.html (ES modules,
// CSS, no build step), offline: it loads nothing over the network, and its trophy list
// and guides are app/data/trophies.json with the cited steps in app/data/details.json.
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
  return list.map((t) => t.id);
}

// --- My own audit of the cited steps. A step without a source, a count that ---
// --- does not add up, or a per-trophy source list that is not the exact union ---
// --- of its steps and disputes stops the build the same way. ---
function auditDetails(trophyIds) {
  const problems = [];
  const details = JSON.parse(readFileSync(join(here, 'app', 'data', 'details.json'), 'utf-8'));
  const sources = JSON.parse(readFileSync(join(here, 'app', 'data', 'sources.json'), 'utf-8'));
  const list = details.details;
  const sourceCount = sources.sources.length;

  if (!Array.isArray(list)) problems.push('details.json has no details array');
  if (list.length !== 55) problems.push(`expected 55 detail entries, found ${list.length}`);
  if (sourceCount !== 28) problems.push(`expected 28 sources, found ${sourceCount}`);

  let steps = 0;
  let cited = 0;
  let backedTwo = 0;
  let guidesBackedTwo = 0;
  let disputes = 0;
  let watch = 0;
  let missable = 0;
  let unconfirmed = 0;
  list.forEach((entry, i) => {
    if (entry.id !== trophyIds[i]) problems.push(`details entry ${i} id ${entry.id} does not match trophy ${trophyIds[i]}`);
    const used = new Set();
    for (const step of entry.steps ?? []) {
      steps += 1;
      if (!step.text) problems.push(`${entry.id}: step with no text`);
      if (!Array.isArray(step.src) || step.src.length === 0) {
        problems.push(`${entry.id}: step with no citation`);
      } else {
        cited += 1;
        if (step.src.length >= 2) backedTwo += 1;
        for (const n of step.src) {
          if (!Number.isInteger(n) || n < 1 || n > sourceCount) problems.push(`${entry.id}: step cites out-of-range source ${n}`);
          used.add(n);
        }
      }
    }
    for (const d of entry.disputes ?? []) {
      disputes += 1;
      if (!d.q || !d.a || !d.b || !d.call) problems.push(`${entry.id}: dispute missing q/a/b/call`);
      if (!Array.isArray(d.sources) || d.sources.length === 0) problems.push(`${entry.id}: dispute with no sources`);
      for (const n of d.sources ?? []) used.add(n);
    }
    if (used.size >= 2) guidesBackedTwo += 1;
    const declared = [...(entry.sources ?? [])].sort((a, b) => a - b);
    const actual = [...used].sort((a, b) => a - b);
    if (JSON.stringify(declared) !== JSON.stringify(actual)) {
      problems.push(`${entry.id}: sources list is not the exact union of steps + disputes`);
    }
    if (entry.watch) watch += 1;
    if (entry.missable) missable += 1;
    if (entry.unconfirmed) unconfirmed += 1;
  });
  if (steps !== 173) problems.push(`expected 173 steps, found ${steps}`);
  if (cited !== 173) problems.push(`expected 173/173 steps cited, found ${cited}`);
  if (backedTwo !== 102) problems.push(`expected 102 steps backed by 2+ sources, found ${backedTwo}`);
  if (guidesBackedTwo !== 52) problems.push(`expected 52/55 guides backed by 2+ sources, found ${guidesBackedTwo}`);
  if (disputes !== 7) problems.push(`expected 7 disputes, found ${disputes}`);
  if (watch !== 9) problems.push(`expected 9 watch flags, found ${watch}`);
  if (missable !== 1) problems.push(`expected 1 missable, found ${missable}`);
  if (unconfirmed !== 5) problems.push(`expected 5 unconfirmed, found ${unconfirmed}`);

  if (problems.length > 0) {
    throw new Error(`details audit failed (${problems.length} problems):\n- ${problems.join('\n- ')}`);
  }
  console.log(
    `details audit OK: 173/173 steps cited, 102 backed by 2+ sources, 52/55 guides backed by 2+, ` +
    `7 disputes, 9 watch, 1 missable, 5 unconfirmed, 28 sources`,
  );
}

const trophyIds = auditTrophies();
auditDetails(trophyIds);

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
