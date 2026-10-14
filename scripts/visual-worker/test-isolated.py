"""Apply migrations and run pipeline tests only in the named, isolated local database."""
from pathlib import Path
import subprocess, json, os, urllib.parse
root = Path.cwd()
dbname = "ans_visual_portfolio_20261013_pipeline"
assert dbname.startswith("ans_visual_portfolio_")
inspect = json.loads(subprocess.check_output(["docker", "inspect", "ans-dev-db"], text=True))[0]
settings = dict(item.split("=", 1) for item in inspect["Config"]["Env"] if "=" in item)
user = settings["POSTGRES_USER"]
exists = subprocess.check_output(["docker", "exec", "ans-dev-db", "psql", "-U", user, "-d", settings["POSTGRES_DB"], "-Atc", "SELECT 1 FROM pg_database WHERE datname = '" + dbname + "'"], text=True).strip()
if not exists:
    subprocess.run(["docker", "exec", "ans-dev-db", "psql", "-U", user, "-d", settings["POSTGRES_DB"], "-c", "CREATE DATABASE " + dbname], check=True, stdout=subprocess.DEVNULL)
url = "postgresql://" + urllib.parse.quote(user, safe="") + ":" + urllib.parse.quote(settings["POSTGRES_PASSWORD"], safe="") + "@127.0.0.1:55437/" + dbname
child = os.environ.copy()
child.update(DATABASE_URL=url, DIRECT_URL=url, AUTH_SECRET="isolated-pipeline-test-secret-not-production", AUTH_URL="http://localhost:3096")
output = root / ".workbuddy" / "visual-portfolio"
output.mkdir(parents=True, exist_ok=True)
with (output / "pipeline-migrations.log").open("w", encoding="utf-8") as log:
    migration = subprocess.run(["node", "node_modules/prisma/build/index.js", "migrate", "deploy"], env=child, stdout=log, stderr=subprocess.STDOUT)
print(json.dumps({"isolatedDatabase": dbname, "migrationExit": migration.returncode}))
if migration.returncode:
    raise SystemExit(migration.returncode)
result = subprocess.run(["node", "node_modules/tsx/dist/cli.mjs", "scripts/visual-worker/integration-test.ts"], env=child)
raise SystemExit(result.returncode)
