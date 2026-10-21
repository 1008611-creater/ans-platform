# -*- coding: utf-8 -*-
import json, os, subprocess, sys, tempfile
V = r"E:\codex\ans\docs\bilibili-ans-launch\video"
tmp = tempfile.mkdtemp(); f = os.path.join(tmp, "credential.json")
json.dump({"sessdata": "FAKESESSDATA123", "bili_jct": "FAKEJCT456", "buvid3": "B3", "buvid4": "B4",
           "dedeuserid": "12345", "ac_time_value": "AC", "saved_at": 1}, open(f, "w", encoding="utf-8"))
env = dict(os.environ); env["BILI_CRED_FILE"] = f; env["PYTHONIOENCODING"] = "utf-8"
r = subprocess.run([sys.executable, os.path.join(V, "publish.py"), "--check-credential"],
                   capture_output=True, text=True, env=env)
print("stdout:", r.stdout.strip())
if r.stderr.strip(): print("stderr:", r.stderr.strip()[:300])
print("退出码:", r.returncode, "→", "通过" if r.returncode == 0 and "FAKESESS" in r.stdout else "失败")
