import json
from pathlib import Path
from common import run

root = Path(__file__).resolve().parents[1]
project = root / "project-template"
checks = ("structure", "time", "money", "state", "references", "ids", "style", "framework")
results = {check: run(check, project) for check in checks}
print(json.dumps({"evals": results, "passed": not any(results.values())}, ensure_ascii=False))
raise SystemExit(1 if any(results.values()) else 0)

