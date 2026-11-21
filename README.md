[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/DizellaCapital/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/DizellaCapital/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

# Leonida Trophy Guide & Tracker — All 55 GTA VI Trophies

A static, offline trophy guide and tracker for **Grand Theft Auto VI** (PlayStation 5, Leonida). The first screen is the working tracker: every one of the 55 trophies with numbered, cited steps, disputes shown both ways, a Next Up planner, a 7-stage platinum roadmap, a missable watch list, spoiler hiding, and a tracker that saves in your browser.

## At a glance

| | |
|---|---|
| Total trophies | **55** — 1 Platinum, 2 Gold, 6 Silver, 46 Bronze |
| PSN points | **1,350** (Platinum 300, Gold 90, Silver 30, Bronze 15) |
| Steps cited | **173/173** — every step carries a source number |
| Backed by 2+ sources | **102 steps** · **52/55 guides** |
| Sources | **28 pages from 20 sites**, read 20 Nov 2026 |
| Disputes | **7 shown both ways**, with our call stated |
| Online trophies | 0 — everything is single-player |
| Playthroughs | 1, with free roam after the story |
| Platinum estimate | Difficulty 4/10, ~200 hours |
| Hardest trophy | **A Long Road** — 100% Completion (Gold) |
| Possibly missable | **Positive Mental Attitude** (meditation) — 1 only |

## What is inside

- **Audit strip** — computed from the data, not typed: 55/55 official name, description and grade · 1P 2G 6S 46B · 1,350 PSN points · 173/173 steps cited · 102 steps backed by 2+ sources · 52/55 guides backed by 2+ sources · 28 pages / 20 sites read 20 Nov 2026 · 7 disputes shown both ways · 5 unconfirmed · 1 possibly missable.
- **All 55 trophies** — official description (corrected to the exact official text on all 55, including the 23rd correction, Let's Go Bowling) + plain-words guide + numbered steps, each step cited inline [n]. The five hidden trophies whose unlock method is still unconfirmed (In The Beginning…, Capital Offense, Bad Luck, I Guess, The Truth Is Out There, Ten Pin) are flagged `method unconfirmed` instead of repeating a rumour as fact.
- **Disputes shown both ways** — 7 disputes (Positive Mental Attitude balcony + 15 vs 18 meditations, Strangers & Freaks strand counting, Down to Earth mission numbering, name spelling, platinum hours, mission count), each with Version A, Version B and our call.
- **Tracker** — dense 3-column layout: checklist left (search, 16 filter chips with counts, stage groups, per-trophy source counts), trophy detail centre (Positive Mental Attitude open by default, with a YOUR COUNT 6/18 meditations stepper), Next Up planner + platinum goal + per-trophy sources right. Tick trophies as they pop; progress and PSN points save in localStorage. First load seeds a labelled DEMO state (14 trophies, 210 pts) to show the tracker; Reset clears to 0. Search, filter by category / grade / status, export progress as JSON and import it back. Story spoilers stay blurred until you choose to reveal them.
- **Platinum roadmap** — 7 stages, each with its trophy count, earned count and a tip, plus the full 35-line 100% checklist for A Long Road (Story & Tasks 12, Exploration & Activities 20, Discovery 3) from PowerPyx's 100% guide.
- **Missable watch list** — the one possibly-missable meditation (do the balcony meditation with Lucia at Jason's house before leaving Chapter 1), plus a 9-trophy watch list, the no-mission-replay save advice and the cheats-disable-trophies warning.
- **Sources tab** — all 28 numbered sources with "cited by X of 55 guides" (the 4 list-check sources are marked as such), all 7 disputes, and the guide-level disputes (story mission count 91/93/95/122, platinum hours ~200 vs up to 300, meditations 15 vs 18).

## Run it

```sh
node serve.ts          # serves app/ at http://localhost:8080
```

Open `app/index.html` directly in a browser, or serve it — no build step, no network calls, plain JavaScript + CSS + JSON.

## Sources (28 pages / 20 sites, read 20 Nov 2026)

- PowerPyx — GTA 6 Trophy Guide & Roadmap, GTA 6 100% Completion Checklist & Guide
- KeenGamer — GTA 6 Trophy Guide & Platinum Roadmap
- Push Square — GTA 6: Trophy Guide & Roadmap
- GTABase — GTA 6 Trophy Guide
- OutputLag — GTA 6 Trophy List
- Beebom, GameTrek, Bloxodes, TheGamersHub, GTAVibes, EGamers.io, GTAScoop, GamesFuze, Mobalytics, Vice Atlas, Insider Gaming, VGC, GTABay and more — the full numbered list with dates and URLs is in `app/data/sources.json` and in the app's Sources tab.

Rockstar has published no official trophy list of its own; names and descriptions are the ones these live lists agree on, cross-checked across at least two sources. Hidden count reported is 28; 25 hidden flags are identified in `app/data/trophies.json` and 3 remain unconfirmed.

## How it is built

`main.ts` (Node, standard library only) copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library (`vendor/makefun-frontend.ts`, unmodified). It also runs a self-check first: the trophy data must hold exactly 55 entries with the 1/2/6/46 grade split, every entry must carry an official description, a guide and a dated source, and the PSN points must total 1,350; the details data must hold 173/173 cited steps, 102 backed by 2+ sources, 52/55 guides backed by 2+ sources, 7 disputes, 9 watch flags and 28 sources — otherwise the build refuses to write a dossier.

## License

MIT — see LICENSE.
