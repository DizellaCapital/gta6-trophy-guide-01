# Leonida Trophy Guide &amp; Tracker — all 55 GTA VI trophies, cited guides, audit strip, platinum roadmap

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/DizellaCapital/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/DizellaCapital/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

A make.fun `program/v1` entry for the account `@a-dizella-capital`.

## What it is

An offline static web app — a guide + tracker for all **55 PlayStation 5 trophies** of
Grand Theft Auto VI (Leonida). Open `app/index.html` in desktop Chrome; it works fully
offline, everything it loads lives under `app/`.

- **All 55 trophies** with their official names, official descriptions and grades —
  1 Platinum, 2 Gold, 6 Silver, 46 Bronze — verified 20 Nov 2026 against Push Square
  (18 Nov 2026), GTABase (18 Nov 2026), Insider Gaming (18 Nov 2026), Radio Times
  (19 Nov 2026), EGamers.io (18 Nov 2026), KeenGamer (19 Nov 2026) and PlayHub
  (18 Nov 2026).
- **Cited guides with dated sources** — every trophy has a guide in its own words
  plus the source and date it was verified against. 49/55 methods are confirmed;
  5 are honestly marked **unconfirmed** and 1 **partial** instead of guessed.
- **Audit strip** — `55/55 described · 55/55 cited · 49/55 methods confirmed ·
  1 missable flagged · last verified 20 Nov 2026`, visible at the top of the page.
- **Platinum roadmap** — 7 stages with stage chips, per-stage earned counts and
  PSN points (full list = 1,350 points). ~200 hours, one playthrough, all offline.
- **Missable watch list** — Positive Mental Attitude is the only trophy guides flag
  as possibly missable (a meditation spot at Jason's house in Chapter 1).
- **Tracker with save** — tick trophies off, progress persists in localStorage,
  with export + import, grade / category / stage / search filters, a spoiler
  setting that hides story trophies until earned, and hide-earned.

## Run it

```sh
node serve.ts            # serves app/ on http://localhost:8080
```

Or open `app/index.html` directly. `main.ts` (Node 22, standard library only) copies
`app/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the
vendored make.fun library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Files

- `app/index.html`, `app/style.css`, `app/app.js` — the guide (dark "Leonida" theme)
- `app/data/trophies.json` — the 55 trophies, guides, sources and audit data
- `screenshots/` — 4 real renders of this guide
- `shots.json` — which views the screenshots show
- `vendor/makefun-frontend.ts` — vendored from the kit, unmodified
- `main.ts`, `serve.ts` — from the kit starter

## Notes

- Grade note: Maximum Withdrawal is Silver in Insider Gaming, Radio Times, GTABase,
  EGamers, GuideDistrict, GTAScoop, AlcastHQ and OfZenAndComputing (the 1-2-6-46
  split holds); Push Square alone lists it as Bronze, which would break the
  reported split, so Silver is used here.
- Unofficial fan guide, not affiliated with Rockstar Games. No Rockstar logos or
  official artwork are used anywhere in this repo.
