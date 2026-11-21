[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/DizellaCapital/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/DizellaCapital/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

# Leonida Trophy Guide & Tracker — All 55 GTA VI Trophies

A static, offline trophy guide and tracker for **Grand Theft Auto VI** (PlayStation 5, Leonida). The first screen is the working tracker: a dense 3-column layout with the trophy checklist, the open trophy's cited step-by-step guide, and a Next Up planner. Every one of the 55 trophies has numbered steps with inline source citations, disputes are shown both ways with our call, and a computed audit strip proves the counts.

## At a glance

| | |
|---|---|
| Total trophies | **55** — 1 Platinum, 2 Gold, 6 Silver, 46 Bronze |
| PSN points | **1,350** (Platinum 300, Gold 90, Silver 30, Bronze 15) |
| Steps cited | **173/173** — every step carries at least one source; **102** steps backed by 2+ sources; **52/55** guides backed by 2+ sources |
| Sources | **28 pages / 20 sites**, read 21 Nov 2026 |
| Disputes | **7** shown both ways (Version A / Version B / Our call) |
| Online trophies | 0 — everything is single-player |
| Playthroughs | 1, with free roam after the story |
| Platinum estimate | Difficulty 4/10, ~200 hours |
| Hardest trophy | **A Long Road** — 100% Completion (Gold), 35-line checklist |
| Possibly missable | **Positive Mental Attitude** (meditation) — 1 only |

## What is inside

- **Audit strip** — computed from the data, not typed: 55/55 official name, description and grade, 173/173 steps cited, 102 steps backed by 2+ sources, 52/55 guides backed by 2+ sources, 28 pages / 20 sites read 21 Nov 2026, 7 disputes shown both ways.
- **Tracker (first screen)** — checklist on the left (search, 16 filter chips with counts, stage groups, per-trophy source counts, HIDDEN / MISSABLE / DISPUTED / WATCH / EARNED tags), trophy detail in the centre (default: Positive Mental Attitude, 39/55 in roadmap order), Next Up planner + Goal + per-trophy sources on the right. Demo seed on first load: 14 trophies marked earned (210 pts, 25%) and a 6/18 meditation counter, labelled DEMO.
- **Every step cited inline [n]** — each trophy's guide is a numbered list of steps, each step with its source numbers. Two genuine content errors from v2 are fixed: Gunslinger (police/soldiers/civilians do not count) and Let's Go Bowling (you do not need all 3 valuables in one visit; the trophy pops after escaping the police).
- **Disputes shown both ways** — Positive Mental Attitude (is the Chapter 1 balcony meditation required? 15 vs 18 meditations), Strangers & Freaks (which strands count toward the 8), Down to Earth mission numbering, the T**s spelling, platinum hours (~200 vs up to 300), story mission count (91 / 93 / 95 / 122). Each with Version A, Version B and Our call.
- **23 official descriptions corrected** to the exact official text (v2 paraphrased them), verified 55/55 against the live lists. Trophy names and guide paragraphs are unchanged from v2.
- **Roadmap tab** — 7 stages with trophy counts, earned counts and tips, plus the full 35-line 100% Completion checklist (Story & Tasks 12, Exploration & Activities 20, Discovery 3) from PowerPyx.
- **Missables tab** — the one possibly-missable meditation, the no-mission-replay save advice, the cheats-disable-trophies warning, and the 9-trophy watch list.
- **Sources tab** — all 28 sources numbered with "cited by X of 55 guides", list-check sources marked, and the guide-level disputes.
- **Tracker** — tick trophies as they pop; progress and PSN points save in localStorage. Search, 16 filter chips, export progress as JSON and import it back. Trophy names are always shown; the spoiler shield masks only the official description, guide and steps in the detail panel.

## Run it

```sh
node serve.ts          # serves app/ at http://localhost:8080
```

Open `app/index.html` directly in a browser, or serve it — no build step, no network calls, plain JavaScript + CSS + JSON.

## Sources (verified 21 Nov 2026)

28 pages / 20 sites, listed in full in the app under Sources (and in `app/data/sources.json`): PowerPyx, KeenGamer, Push Square, GTABase, OutputLag, Exophase, Beebom, GameTrek, Bloxodes, TheGamersHub, GTABay, VGC, Insider Gaming, GTAVibes, EGamers.io, GTAScoop, GamesFuze, Mobalytics, Vice Atlas and more. Four of them (GamesFuze, Mobalytics, Vice Atlas, Insider Gaming) are list-check sources — full-list verification only, never cited by a step.

Rockstar has published no official trophy list of its own; names and descriptions are the ones these live lists agree on, cross-checked across at least two sources. Hidden count reported is 28; 25 hidden flags are identified in `app/data/trophies.json` and 3 remain unconfirmed. The five hidden trophies whose unlock method is still unconfirmed (In The Beginning…, Capital Offense, Bad Luck, I Guess, The Truth Is Out There, Ten Pin) are flagged `method unconfirmed` instead of repeating a rumour as fact.

## How it is built

`main.ts` (Node, standard library only) copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library (`vendor/makefun-frontend.ts`, unmodified). It also runs a small self-check first: the trophy data must hold exactly 55 entries with the 1/2/6/46 grade split, every entry must carry an official description, a guide and a dated source, and the PSN points must total 1,350 — otherwise the build refuses to write a dossier. It also audits `app/data/details.json`: 173/173 steps cited, 102 backed by 2+ sources, 52/55 guides backed by 2+ sources, 7 disputes, 9 watch flags, 1 missable, 5 unconfirmed, 28 sources; per-trophy sources must equal the exact union of its steps' and disputes' sources.

## License

MIT — see LICENSE.
