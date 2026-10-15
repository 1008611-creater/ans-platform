"""Seed only the current tenant's persistent home, then run the upstream server."""
import json
import os
import subprocess
from pathlib import Path

root = Path("/workspace")
state = Path.home() / ".openclaw-easel"
state.mkdir(mode=0o700, parents=True, exist_ok=True)
configuration = state / "openclaw.json"
if not configuration.exists():
    configuration.write_text(json.dumps({
        "gateway": {"mode": "local", "bind": "loopback", "port": 37289, "auth": {"mode": "none"},
                    "http": {"endpoints": {"chatCompletions": {"enabled": True}}}},
        "agents": {"defaults": {"workspace": str(state / "workspace"), "timeoutSeconds": 7200}},
    }), encoding="utf-8")
    configuration.chmod(0o600)
if not (root / ".env").exists():
    (root / ".env").write_text("EASEL_CHAT_TRANSPORT=http\n", encoding="utf-8")
    (root / ".env").chmod(0o600)
os.environ["EASEL_OPENCLAW_WORKSPACE"] = str(state / "workspace")
subprocess.run(["python", "-m", "easel.installation", str(root), "openclaw"], check=True, cwd=root)
subprocess.run(["bash", "agents/sync.sh"], check=True, cwd=root)
# No model credentials are inherited from the ANS process or the gateway.
# Models and platform accounts must be configured by this workspace's owner.
subprocess.Popen(["bash", "scripts/gateway.sh", "start"], cwd=root)
os.execvp("python", ["python", "-m", "uvicorn", "web.app:app", "--host", "0.0.0.0", "--port", "7860", "--no-access-log"])
