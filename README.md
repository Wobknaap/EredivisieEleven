# Eredivisie Daily Eleven

A locally playable React + TypeScript football guessing game. The current small player list is **demonstration data**, not a verified historical database. Do not treat it as comprehensive. It contains 26 selected historic and current names; there is no verified season coverage or imported eligibility count yet.

## Run

```sh
npm install
npm run dev
npm run build
npm run preview
npm test
```

Use `Nieuwe testpuzzel` for a fresh board and `Terug naar vandaag` to restore the daily board. Daily progress uses versioned local storage keyed to the Amsterdam calendar date. Scoring deducts `round(1000 / (appearances + 2 × goals + 10))` (clamped to 10–100); this is an estimate based on demonstration metadata, not community selections.

## Data

The prepared source is `src/players.ts`. It intentionally identifies itself as a demo. `scripts/prepare_data.py` inspects a user-supplied DuckDB snapshot and refuses to infer columns or league IDs. Obtain the source dataset from [dcaribou/transfermarkt-datasets](https://github.com/dcaribou/transfermarkt-datasets), review its current license and the underlying data reuse restrictions, inspect schema and competition IDs, then implement/export fields only when reuse is cleared. No raw database is bundled. Current verified season coverage: none. Broad Defender/Midfield/Attack mappings do not prove left/right footed roles; the current formation uses broad category eligibility.

## Deploy

Push to `main`; GitHub Actions runs tests and builds Pages at `/EredivisieEleven/`. In repository Settings → Pages, choose **GitHub Actions** as the source. The expected project URL is `https://Wobknaap.github.io/EredivisieEleven/` after the workflow succeeds.

## Limitations

The demo dataset is intentionally limited and does not claim full eligibility. Puzzle clue intersections and scoring use only its prepared facts. A production real-data import, full matching-based puzzle generator, and browser end-to-end coverage remain to be implemented after source schema and rights are verified.
