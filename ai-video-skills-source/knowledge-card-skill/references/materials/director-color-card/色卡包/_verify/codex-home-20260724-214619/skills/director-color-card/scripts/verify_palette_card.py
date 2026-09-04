import argparse
import json
from pathlib import Path

from palette_core import verify_output


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify a rendered palette-card output directory.")
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("--preview", action="store_true")
    args = parser.parse_args()
    report = verify_output(args.output_dir, strict=not args.preview)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
