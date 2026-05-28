"""
StatsBomb Open Data Loader

This package has been modularized for maintainability:

- etl.utils          : shared helpers (fetch_json, constants)
- etl.competitions   : competitions & seasons loading
- etl.matches        : matches loading
- etl.players        : players loading from lineups
- etl.events         : events loading
- etl.cli            : command-line interface and argument parsing

The main entry point is via `etl.cli`.
"""

if __name__ == "__main__":
    from etl import cli
    cli.main()
