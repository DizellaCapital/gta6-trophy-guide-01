[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/DizellaCapital/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/DizellaCapital/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

# Leonida Trophy Guide & Tracker — All 55 GTA VI Trophies

A static, offline trophy guide and tracker for **Grand Theft Auto VI** (PlayStation 5, Leonida). Every one of the 55 trophies with its official description, a guide in plain words, a dated source, a 7-stage platinum roadmap, a missable watch list, spoiler hiding, and a tracker that saves in your browser.

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

- **Audit strip** — 55/55 trophies described, 55/55 guides cited and dated, 50/55 methods confirmed, last verified 20 Nov 2026.
- **All 55 trophies** — official description + plain-words guide + source and date for every entry. The five hidden trophies whose unlock method is still unconfirmed (In The Beginning…, Capital Offense, Bad Luck, I Guess, The Truth Is Out There, Ten Pin) are flagged `method unconfirmed` instead of repeating a rumour as fact.
- **Platinum roadmap** — 7 stages, each with its trophy count, earned count and a tip: story chapters, named story missions, strangers & side strands, crime & robberies, activities & races, collectibles & exploration, money / misc / Platinum.
- **Missable watch list** — the one possibly-missable meditation (do the balcony meditation with Lucia at Jason's house before leaving Chapter 1), plus the no-mission-replay save advice and the cheats-disable-trophies warning.
- **Tracker** — tick trophies as they pop; progress and PSN points save in localStorage. Search, filter by grade / stage / status, export progress as JSON and import it back. Story spoilers stay blurred until you choose to reveal them.
- **100% checklist summary** for A Long Road: the exact numbers the in-game checklist asks for (100 optional tasks, 39 gang operations, 22 bank jobs, 8 bank vaults, 15 of 18 card sets, 100 WAiNK scans, 300 of 397 stunts, 70 of 80 challenges, and more).

## Run it

```sh
node serve.ts          # serves app/ at http://localhost:8080
```

Open `app/index.html` directly in a browser, or serve it — no build step, no network calls, plain ES modules + CSS + JSON.

## Sources (verified 20 Nov 2026)

- Push Square — GTA 6: Trophy Guide & Roadmap (18 Nov 2026)
- KeenGamer — GTA 6 Trophy Guide & Platinum Roadmap (19 Nov 2026)
- GTAVibes — GTA 6 Trophy List: All 55 Trophies and Achievements (18 Nov 2026)
- EGamers.io — GTA 6 Trophy List (19 Nov 2026)
- GTAScoop — GTA 6 Trophies & Achievements: Full List of 55 and Platinum (18 Nov 2026)
- GamesFuze — GTA 6 Trophy List (19 Nov 2026)

Rockstar has published no official trophy list of its own; names and descriptions are the ones these live lists agree on, cross-checked across at least two sources. Hidden count reported is 28; 25 hidden flags are identified in `app/data/trophies.json` and 3 remain unconfirmed.

## How it is built

`main.ts` (Node, standard library only) copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library (`vendor/makefun-frontend.ts`, unmodified). It also runs a small self-check first: the trophy data must hold exactly 55 entries with the 1/2/6/46 grade split, every entry must carry an official description, a guide and a dated source, and the PSN points must total 1,350 — otherwise the build refuses to write a dossier.

## License

MIT — see LICENSE.
