[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/DizellaCapital/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/DizellaCapital/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

# Leonida Trophy Guide & Tracker — All 55 GTA VI Trophies

A static, offline trophy guide and tracker for **Grand Theft Auto VI** (PlayStation 5, Leonida). Every one of the 55 trophies with its official description, a step-by-step guide with cited sources, a 7-stage platinum roadmap, a missable watch list, spoiler hiding, and a tracker that saves in your browser.

## At a glance

| | |
|---|---|
| Total trophies | **55** — 1 Platinum, 2 Gold, 6 Silver, 46 Bronze |
| PSN points | **1,350** (Platinum 300, Gold 90, Silver 30, Bronze 15) |
| Online trophies | 0 — everything is single-player |
| Playthroughs | 1, with free roam after the story |
| Platinum estimate | Difficulty 4/10, ~200 hours |
| Hardest trophy | **A Long Road** — 100% Completion (Gold) |
| Possibly missable | **Positive Mental Attitude** (meditation) — 1 only |

## What is inside

- **Audit strip** — 173/173 steps cited, 102 steps backed by 2+ sources, 52/55 guides backed by 2+ sources, 28 pages across 20 sites read 21 Nov 2026.
- **All 55 trophies** — official description + plain-words guide + step-by-step cited method for every entry. The five hidden trophies whose unlock method is still unconfirmed (In The Beginning…, Capital Offense, Bad Luck, I Guess, The Truth Is Out There, Ten Pin) are flagged `method unconfirmed` instead of repeating a rumour as fact.
- **7 disputes shown both ways** — where the sources disagree (the Chapter 1 balcony meditation, 15 vs 18 meditations, the story mission count, the platinum hours, the Down to Earth numbering, the T\*\*s spelling, which stranger strands count), both versions are quoted with our call.
- **Platinum roadmap** — 7 stages, each with its trophy count, earned count and a tip: story chapters, named story missions, strangers & side strands, crime & robberies, activities & races, collectibles & exploration, money / misc / Platinum.
- **Missable watch list** — the one possibly-missable meditation (do the balcony meditation with Lucia at Jason's house before leaving Chapter 1), plus the no-mission-replay save advice and the cheats-disable-trophies warning.
- **Tracker** — tick trophies as they pop; progress and PSN points save in localStorage. Search, filter with 16 chips (category, grade, earned, remaining, missable, unconfirmed), export progress as JSON and import it back. Story spoilers stay hidden until you choose to reveal them.
- **100% checklist summary** for A Long Road: the exact numbers the in-game checklist asks for (100 optional tasks, 39 gang operations, 22 bank jobs, 8 bank vaults, 15 of 18 card sets, 100 WAiNK scans, 300 of 397 stunts, 70 of 80 challenges, and more).

## Run it

```sh
node serve.ts          # serves app/ at http://localhost:8080
```

Open `app/index.html` directly in a browser, or serve it — no build step, no network calls, plain ES modules + CSS + JSON.

## Sources (verified 21 Nov 2026)

28 pages across 20 sites, listed in full with dates and per-trophy citations in `app/data/sources.json`:

- PowerPyx — Trophy Guide & Roadmap, 100% Completion Checklist & Guide, All Meditation Spot Locations, Down to Earth Walkthrough, Hit Kingpin Bowling Walkthrough (18 Nov 2026)
- OutputLag — GTA 6 Trophy List (18 Nov 2026)
- KeenGamer — Trophy Guide & Platinum Roadmap (19 Nov 2026), All 18 Meditation Spots and Rewards (20 Nov 2026)
- Beebom — All GTA 6 Meditation Spots Locations (19 Nov 2026)
- GameTrek — Trophy Guide, Combat Focus Explained (20 Nov 2026)
- Bloxodes — All 55 Trophies & Achievements, All 10 Meditation Spots (18–19 Nov 2026)
- TheGamersHub — GTA 6 Trophy List (19 Nov 2026)
- VGC — Down To Earth Mission Walkthrough (18 Nov 2026)
- Push Square — Trophy Guide & Roadmap, 100% Completion Checklist (18 Nov 2026)
- GTABay — Mission List (19 Nov 2026)
- GTAScoop — Trophies & Achievements (18 Nov 2026)
- GTABase — Trophy Guide & Achievements List (18 Nov 2026)
- Exophase — Grand Theft Auto VI Trophies PS5 (18 Nov 2026)
- GTA-Zone — GTA 6 Trophy List (18 Nov 2026)
- Vice Atlas — Down To Earth walkthrough (18 Nov 2026)
- GamesFuze, Mobalytics, Insider Gaming, PSNProfiles, Game-Checklists — list checks

Rockstar has published no official trophy list of its own; names and descriptions are the ones these live lists agree on, cross-checked across at least two sources. Hidden count reported is 28; 25 hidden flags are identified in `app/data/trophies.json` and 3 remain unconfirmed.

## How it is built

`main.ts` (Node, standard library only) copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library (`vendor/makefun-frontend.ts`, unmodified). It also runs two self-checks first: the trophy data must hold exactly 55 entries with the 1/2/6/46 grade split, every entry must carry an official description, a guide and a dated source, and the PSN points must total 1,350; and the cited steps must hold exactly 173 steps, 173/173 cited, 102 backed by 2+ sources, 52/55 guides backed by 2+, 7 disputes, 9 watch flags, 1 missable and 5 unconfirmed — otherwise the build refuses to write a dossier.

## License

MIT — see LICENSE.
