"""Disposable PostgreSQL migration/receipt regression; never copies real data.

Uses the already running, exact local Docker fixture named below. Refuses an
existing database and drops only its own newly created, owner-commented database.
No passwords/keys/configuration are emitted or persisted.
"""
from __future__ import annotations
import hashlib
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTEXT = "desktop-linux"
CONTAINER = "ans-platform-db-1"
CONTAINER_ID = "fb6bb452871029943416aa1cad3bfda0154aeeac0d6ec447395777896c5a6858"
DATABASE = "ans_compute_units_20261016"
MARKER = "ANS isolated compute billing regression 20261016; disposable; no real data"
MIGRATION = "20261016120000_model_billing_units_v2"
REPORT = ROOT / "docs/agent-team/compute-acceptance-20261016/billing-units-postgres.json"

def docker(*args: str, input_text: str | None = None) -> str:
    result = subprocess.run(["docker", "--context", CONTEXT, *args], input=input_text,
                            capture_output=True, text=True, encoding="utf-8", timeout=90)
    if result.returncode:
        # Statements contain only repository SQL and synthetic fixtures. Docker
        # inspect data is never included; diagnostics remain bounded.
        raise RuntimeError(f"docker stage failed ({result.returncode}): {result.stderr[-2500:]}")
    return result.stdout

info = json.loads(docker("inspect", CONTAINER))[0]
if info["Id"] != CONTAINER_ID or info["Config"]["Image"] != "postgres:17-bookworm":
    raise SystemExit("Fixture identity changed; refusing database writes")
labels = info["Config"].get("Labels", {})
if not labels.get("com.docker.compose.project.working_dir", "").replace("\\", "/").lower().endswith("/.workbuddy/apps/ans-platform"):
    raise SystemExit("Fixture ownership changed; refusing database writes")
username = next((entry.split("=", 1)[1] for entry in info["Config"]["Env"] if entry.startswith("POSTGRES_USER=")), "postgres")
del info

def psql(sql: str, db: str = DATABASE) -> str:
    return docker("exec", "-i", CONTAINER, "psql", "-X", "-v", "ON_ERROR_STOP=1", "-At", "-U", username, "-d", db, input_text=sql)

if psql(f"SELECT count(*) FROM pg_database WHERE datname='{DATABASE}';", "postgres").strip() != "0":
    raise SystemExit("Disposable database already exists; refusing overwrite or deletion")
created = False
report: dict[str, object] = {"containerId": CONTAINER_ID, "database": DATABASE, "copiedProductionData": False, "createdService": False}
stage = "create-disposable-database"
try:
    psql(f'CREATE DATABASE "{DATABASE}"; COMMENT ON DATABASE "{DATABASE}" IS \'{MARKER}\';', "postgres")
    created = True
    migrations = sorted((ROOT / "prisma/migrations").glob("*/migration.sql"))
    old = [path for path in migrations if path.parent.name != MIGRATION]
    applied = []
    for path in old:
        stage = "base-migration:" + path.parent.name
        psql(path.read_text(encoding="utf-8-sig"))
        applied.append(path.parent.name)
    stage = "historical-fixture-before-migration"
    psql((ROOT / "scripts/fixtures/model-billing-units-before.sql").read_text(encoding="utf-8-sig"))
    path = ROOT / "prisma/migrations" / MIGRATION / "migration.sql"
    stage = "new-billing-migration"
    psql(path.read_text(encoding="utf-8-sig"))
    stage = "receipt-and-state-assertions"
    output = psql((ROOT / "scripts/fixtures/model-billing-units-after.sql").read_text(encoding="utf-8-sig"))
    report.update({"passed": True, "baseMigrations": len(applied), "migrationSha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                   "assertions": [line.removeprefix("assert:") for line in output.splitlines() if line.startswith("assert:")]})
except Exception as error:
    report.update({"passed": False, "failedStage": stage, "error": str(error)})
finally:
    if created:
        owner_comment = psql(f"SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname='{DATABASE}';", "postgres").strip()
        if owner_comment != MARKER:
            report["cleanup"] = "refused: owner marker changed"
        else:
            psql(f'DROP DATABASE "{DATABASE}";', "postgres")
            report["cleanup"] = psql(f"SELECT count(*) FROM pg_database WHERE datname='{DATABASE}';", "postgres").strip() == "0"
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))
if not report.get("passed") or report.get("cleanup") is not True:
    sys.exit(1)
