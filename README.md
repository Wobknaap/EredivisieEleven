# Eredivisie Daily Eleven

A locally playable React + TypeScript football guessing game. The current small player list is **demonstration data**, not a verified historical database. Do not treat it as comprehensive. It contains 26 selected historic and current names; there is no verified season coverage or imported eligibility count yet.

## Run

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run build
npm.cmd run preview
npm.cmd test
npm.cmd run test:e2e
```

On macOS/Linux, replace `npm.cmd` with `npm`.

Use `Nieuwe testpuzzel` for a fresh board and `Terug naar vandaag` to restore the daily board. Daily progress uses versioned local storage keyed to the Amsterdam calendar date. The model assigns each valid answer a synthetic share: `(appearances + 2 × goals + 10)^1.3`, normalized against all valid answers for that slot. Tiers use that share (Diamond <5%, Legendary <12%, Epic <25%, Rare <40%, otherwise Common). Score deduction is `round(10 + 90 × (1 − share)^1.5)`, clamped to 10–100. These percentages are a deterministic model for gameplay, not actual player popularity or community votes.

## Data

The prepared source is `src/players.ts`. It intentionally identifies itself as a demo. `scripts/prepare_data.py` inspects a user-supplied DuckDB snapshot and refuses to infer columns or league IDs. Obtain the source dataset from [dcaribou/transfermarkt-datasets](https://github.com/dcaribou/transfermarkt-datasets), review its current license and the underlying data reuse restrictions, inspect schema and competition IDs, then implement/export fields only when reuse is cleared. No raw database is bundled. Current verified season coverage: none. Broad Defender/Midfield/Attack mappings do not prove left/right footed roles; the current formation uses broad category eligibility.

## Deploy

Push to `main`; GitHub Actions runs tests and builds Pages at `/EredivisieEleven/`. In repository Settings → Pages, choose **GitHub Actions** as the source. The expected project URL is `https://Wobknaap.github.io/EredivisieEleven/` after the workflow succeeds.

## Limitations

The demo dataset is intentionally limited and does not claim full eligibility. Puzzle clue intersections and scoring use only its prepared facts. A production real-data import, full matching-based puzzle generator, and browser end-to-end coverage remain to be implemented after source schema and rights are verified.
