# Eredivisie Eleven

Een dagelijkse 4-3-3 voetbalpuzzel met echte, gedocumenteerde Eredivisie-optredens. De site werkt op GitHub Pages. De Cloudflare Worker telt anonieme correcte keuzes; het spel blijft zonder API speelbaar.

## Spelen en lokaal draaien

```powershell
npm.cmd install
npm.cmd run api:db:local
npm.cmd run api:dev
npm.cmd run dev
```

Open de Vite URL die in de terminal verschijnt. Voor een productiebuild en checks:

```powershell
npm.cmd test
npm.cmd run test:e2e
npm.cmd run build
npm.cmd run preview
```

Op macOS of Linux gebruik je `npm` in plaats van `npm.cmd`.

## Data

De bron is de [Transfermarkt-datasets DuckDB snapshot](https://github.com/dcaribou/transfermarkt-datasets), gepubliceerd door dcaribou. De bron bevat gegevens tot juli 2026. De export in `src/data/players.json` is gemaakt met `scripts/export_eredivisie.sql`. Alleen een `appearances` record gekoppeld aan een Eredivisie-wedstrijd (`NL1`), met een club-ID dat overeenkomt met thuis- of uitteam, telt als bewijs. Clubhistorie komt uitsluitend uit zulke optredens; transfers en huidige clubs tellen niet automatisch mee.

De snapshot levert **2.617 spelers** met bewezen Eredivisie-optredens, waarvan **2.605** een bruikbare brede positie hebben. Het bereik is seizoen **2012 t/m 2025**. Dit is niet de volledige Eredivisiegeschiedenis; dit bereik is voorlopig bewust gekozen. Twaalf spelers hebben geen bruikbare positie en kunnen nog niet als antwoord worden gekozen. De exacte dekking en ontbrekende velden staan in `src/data/metadata.json`.

Om de data opnieuw te maken, installeer Python en DuckDB en voer uit:

```powershell
py -m pip install duckdb
py scripts/prepare_data.py --download
```

Of geef een reeds gedownloade `.duckdb` als argument mee. De ruwe database staat in `data/raw/` en wordt door Git genegeerd. Het script controleert eerst het bronschema en de competitie-ID. Het SQL-bestand werkt ook rechtstreeks met de DuckDB CLI. De data-adapter is `src/players.ts`.

De bronrepo heeft een CC0-licentie voor eigen materiaal. Onderliggende Transfermarkt-gegevens kunnen afzonderlijke databank- of gebruiksrechten hebben. Herpublicatie en commercieel gebruik moeten aan die voorwaarden worden getoetst. Er worden geen spelersfoto's, clublogo's of live scrapers gebruikt.

## Regels

- 4-3-3: linksbuiten, spits, rechtsbuiten, drie middenvelders, vier verdedigers en een keeper.
- Eén speler per positie en nooit dezelfde speler twee keer.
- Startscore 1.100; twaalf foute pogingen voor het hele elftal. De laagste eindscore wint.
- Een geldig fout antwoord kost één poging; onbekende of dubbele invoer niet.
- Elk slot heeft meerdere geldige antwoorden. De generator controleert via bipartite matching of elf unieke spelers het volledige elftal kunnen vullen.
- De dagelijkse seed is de Amsterdamse datum plus de dataversie. De dag wisselt om middernacht, ook bij zomer- en wintertijd. Voortgang staat per dag en dataversie in `localStorage`.
- De zoeklijst toont spelersnamen en vlaggen, zonder club, positietekst of andere hints. Een speler telt voor elke Eredivisieclub waarvoor zijn wedstrijdoptredens zijn gedocumenteerd. De aanwijzingen en puzzelgenerator staan afzonderlijk in `src/puzzle.ts`; score en spelstatus staan in `src/engine.ts`.
- `Nieuwe testpuzzel` maakt een nieuw geldig bord en laat de dagpuzzel intact. `Terug naar vandaag` herstelt die dagpuzzel.

De percentageweergave is een **modelschatting**, geen gemeten populariteit: per geldig antwoord krijgt een speler gewicht `(Eredivisie-optredens + 2 × doelpunten + 10)^0,75`; zijn percentage is zijn gewicht gedeeld door het totaal voor dat slot. De aftrek is `round(10 + 90 × (1 − percentage/100)^1,5)`, begrensd op 10–100. Zeldzaamheidslabels: Diamond <5%, Legendary <12%, Epic <25%, Rare <40%, anders Common. De score is daardoor reproduceerbaar en verandert niet door nieuwe bezoekers.

## Deploy

Push naar `main` bouwt en publiceert GitHub Pages via `.github/workflows/deploy.yml`. Kies in de repo **Settings → Pages → Build and deployment → GitHub Actions**. De site staat op [wobknaap.github.io/EredivisieEleven](https://wobknaap.github.io/EredivisieEleven/). De Vite base path is ingesteld voor deze projectrepo.

De Worker en D1 staan in `backend/` en `wrangler.toml`. Voor automatische API-deploys zijn repository variable `CLOUDFLARE_ACCOUNT_ID` en secret `CLOUDFLARE_API_TOKEN` nodig. `.github/workflows/deploy-api.yml` voert migraties uit en deployt de Worker. De API is aanvullend; de statische website valideert antwoorden lokaal. Daardoor zijn antwoorden technisch zichtbaar voor wie de webbestanden inspecteert. De Worker beperkt dubbele telling via een anonieme sessie-ID, maar biedt geen fraudebestendige leaderboard.

De huidige productiebuild is circa 856 kB JavaScript ongecomprimeerd en 143 kB gzip. De ruwe DuckDB-snapshot wordt nooit door de browser gedownload.
