import json
import sys
from common import project_path, run

root = project_path()
checks = ("structure", "time", "money", "state", "references", "ids", "style", "framework", "workflow")
codes = [run(check, root) for check in checks]
print(json.dumps({"summary": "failed" if any(codes) else "passed", "checks": checks}, ensure_ascii=False))
raise SystemExit(1 if any(codes) else 0)

