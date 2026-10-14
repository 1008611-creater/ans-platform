"""Start a local preview with isolated data. Real provider submissions remain disabled."""
import subprocess, json, os, urllib.parse, secrets
from pathlib import Path
inspect=json.loads(subprocess.check_output(["docker","inspect","ans-dev-db"],text=True))[0]
settings=dict(item.split("=",1) for item in inspect["Config"]["Env"] if "=" in item)
dbname="ans_visual_portfolio_20261013_pipeline"
url="postgresql://"+urllib.parse.quote(settings["POSTGRES_USER"],safe="")+":"+urllib.parse.quote(settings["POSTGRES_PASSWORD"],safe="")+"@127.0.0.1:55437/"+dbname
child=os.environ.copy()
child.update(DATABASE_URL=url,DIRECT_URL=url,AUTH_SECRET=secrets.token_hex(32),AUTH_URL="http://localhost:3096",ANS_TRIPO_ACCEPTING_JOBS="false",ANS_TRIPO_ALLOW_SUBMISSIONS="false",ANS_VISUAL_PUBLISH_ENABLED="true",ANS_VISUAL_DOMAINS_ENABLED="false",ANS_VISUAL_STORAGE_MODE="local",ANS_VISUAL_STORAGE_DIR=str(Path.cwd()/".workbuddy/visual-assets-pipeline"),ANS_VISUAL_SIGNING_SECRET=secrets.token_hex(32),ANS_VISUAL_WORKER_KEY=secrets.token_hex(32),ANS_VISUAL_PUBLICATION_KEY=secrets.token_hex(32),ANS_VISUAL_PUBLIC_ORIGIN="http://localhost:3102")
subprocess.run(["node","node_modules/tsx/dist/cli.mjs","scripts/visual-worker/setup-preview.ts"],env=child,check=True)
gatewayenv=child.copy()
gatewayenv.update(ANS_API_ORIGIN="http://localhost:3096",ANS_PUBLICATION_ORIGIN="http://localhost:3102",ANS_PUBLICATION_KEY=child["ANS_VISUAL_PUBLICATION_KEY"],PORT="3102")
output=Path.cwd()/".workbuddy/visual-portfolio"
output.mkdir(parents=True,exist_ok=True)
with (output/"preview-gateway.log").open("w",encoding="utf-8") as gatewaylog, (output/"preview-app.log").open("w",encoding="utf-8") as applog:
 gateway=subprocess.Popen(["node","deploy/visual-sites/server.mjs"],env=gatewayenv,stdout=gatewaylog,stderr=subprocess.STDOUT)
 try:
  print("Local editor on 3096; publication gateway on 3102. Provider submissions disabled.",flush=True)
  subprocess.run(["node","node_modules/next/dist/bin/next","dev","--webpack","--port","3096"],env=child,stdout=applog,stderr=subprocess.STDOUT,check=True)
 finally:
  gateway.terminate()
