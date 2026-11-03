"""Rebuild the static player pool from the published Transfermarkt DuckDB snapshot.

Run: py -m pip install duckdb
     py scripts/prepare_data.py --download
Or pass a local DuckDB path without --download. The raw file stays gitignored.
"""
import argparse
import json
from pathlib import Path
from urllib.request import urlretrieve

SOURCE = "https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/transfermarkt-datasets.duckdb"
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "src/data/players.json"
REQUIRED = {
    "appearances": {"player_id", "game_id", "player_club_id", "goals"},
    "games": {"game_id", "competition_id", "home_club_id", "away_club_id", "season"},
    "players": {"player_id", "name", "position", "sub_position", "country_of_citizenship", "date_of_birth"},
    "clubs": {"club_id", "name"},
    "competitions": {"competition_id", "name", "country_name"},
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("database", type=Path, nargs="?", default=ROOT / "data/raw/transfermarkt-datasets.duckdb")
    parser.add_argument("--download", action="store_true")
    args = parser.parse_args()
    if args.download:
        args.database.parent.mkdir(parents=True, exist_ok=True)
        urlretrieve(SOURCE, args.database)
    try:
        import duckdb
    except ImportError as exc:
        raise SystemExit("Install DuckDB: py -m pip install duckdb") from exc
    if not args.database.exists():
        raise SystemExit(f"Snapshot not found: {args.database}. Use --download to fetch it.")
    con = duckdb.connect(str(args.database), read_only=True)
    for table, required in REQUIRED.items():
        actual = {row[1] for row in con.execute(f"PRAGMA table_info('{table}')").fetchall()}
        if required - actual:
            raise SystemExit(f"{table}: missing columns {sorted(required - actual)}")
    leagues = con.execute("SELECT competition_id FROM competitions WHERE lower(name) = 'eredivisie' AND country_name = 'Netherlands'").fetchall()
    if len(leagues) != 1:
        raise SystemExit(f"Expected one Eredivisie competition, found {leagues}")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    sql = (ROOT / "scripts/export_eredivisie.sql").read_text(encoding="utf-8")
    con.execute(sql.replace("'src/data/players.json'", "'" + OUTPUT.as_posix() + "'"))
    players = json.loads(OUTPUT.read_text(encoding="utf-8"))
    seasons = sorted({season for player in players for season in player["seasons"]})
    playable = sum(player["position"] in {"Goalkeeper", "Defender", "Midfield", "Attack"} for player in players)
    report = {
        "source": "https://github.com/dcaribou/transfermarkt-datasets",
        "competitionId": leagues[0][0],
        "eligiblePlayers": len(players),
        "playablePlayers": playable,
        "firstSeason": seasons[0],
        "lastSeason": seasons[-1],
        "seasons": seasons,
        "missingPosition": len(players) - playable,
        "missingNation": sum(not player["nation"] for player in players),
        "evidence": "Recorded appearance in an Eredivisie game with a matching home or away club ID",
        "honours": {
            "competitions": ["Eredivisie", "KNVB Beker", "Johan Cruijff Schaal"],
            "playerEvidence": "Recorded appearance in the relevant competition during the season",
            "knvbBekerWinnerEvidence": "Player appeared for the winning club in a KNVB Beker season",
            "championEvidence": "Player appeared for the Eredivisie champion in a league season",
        },
    }
    (ROOT / "src/data/metadata.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
