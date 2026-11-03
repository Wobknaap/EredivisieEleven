"""Build a compact player JSON from an externally supplied Transfermarkt DuckDB snapshot.

The source has third-party data rights; this script deliberately downloads nothing and exports
only when the operator has obtained and reviewed a lawful local copy.
"""
import argparse, json
from pathlib import Path
try:
    import duckdb
except ImportError as exc:
    raise SystemExit('Install duckdb with: py -m pip install duckdb') from exc

def main():
    parser=argparse.ArgumentParser();parser.add_argument('database',help='Path to locally obtained DuckDB snapshot');args=parser.parse_args()
    con=duckdb.connect(args.database,read_only=True)
    tables=con.execute('show tables').fetchall(); print('Tables:',', '.join(x[0] for x in tables))
    names={x[0] for x in tables}
    required={'players','appearances','games','competitions'}
    if not required.issubset(names): raise SystemExit('Required source tables absent; inspect actual schema before adapting query.')
    for table in sorted(required): print('\n',table,con.execute(f"describe {table}").fetchall())
    raise SystemExit('Schema inspection complete. Confirm competition identifier and data reuse rights, then adapt the documented export query.')
if __name__=='__main__': main()
