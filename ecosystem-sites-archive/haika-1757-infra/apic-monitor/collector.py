#!/usr/bin/env python3
"""Monitor existing APIC upstream channels without changing New API data."""
import concurrent.futures
import datetime as dt
import fcntl
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import tempfile
import time

ROOT = Path(os.environ.get("APIC_MONITOR_ROOT", "/opt/apic-monitor"))
INTERVAL = 300
DEFINITIONS = [
    ("gpt-free", "GPT Free", "OpenAI", 6, "gpt_free", "gpt-6-astra", False),
    ("gpt-plus", "GPT Plus", "OpenAI", 9, "gpt_plus", "gpt-5.6-sol", True),
    ("gpt-pro", "GPT Pro", "OpenAI", 7, "gpt_pro", "gpt-5.6-sol", True),
    ("kun", "Kun", "DeepSeek", 11, "kun", "deepseek-v4.1-flash", True),
    ("grok", "Grok", "Grok", 8, "grok", "grok-4.7", True),
    ("kimi", "Kimi", "Kimi", 10, "kimi", "kimi-k3", True),
    ("gemini", "Gemini", "Gemini", None, "gemini", None, False),
    ("glm", "GLM", "GLM", None, "glm", None, False),
]
ALLOWED_ORIGIN = "https://www.mcgrox.top"
WINDOWS = {"hour": 3600, "days15": 15 * 86400, "days30": 30 * 86400}
RANK = {"operational": 0, "degraded": 1, "failed": 2, "error": 3}


def iso(timestamp):
    return dt.datetime.fromtimestamp(timestamp, dt.timezone.utc).isoformat(timespec="seconds")


def read_channels():
    info = json.loads(subprocess.check_output(["docker", "inspect", "new-api-postgres"], timeout=10))[0]
    env = dict(item.split("=", 1) for item in info["Config"]["Env"] if "=" in item)
    # Keys stay in process memory and are never persisted or printed.
    sql = '''select coalesce(json_agg(c),'[]') from
       (select id,status,type,"group",models,model_mapping,base_url,key from channels
        where id in (6,7,8,9,10,11)) c'''
    raw = subprocess.check_output(["docker", "exec", "new-api-postgres", "psql", "-U", env["POSTGRES_USER"],
        "-d", env["POSTGRES_DB"], "-At", "-c", sql], timeout=10, stderr=subprocess.DEVNULL)
    return {row["id"]: row for row in json.loads(raw)}


def curl(request_url, payload, key):
    # Configuration enters stdin, never argv. No redirects, no credential logs.
    settings = ["silent", 'request = "POST"',
        "url = " + json.dumps(request_url), "max-time = 45", "connect-timeout = 8",
        'write-out = "\\n%{http_code} %{time_appconnect} %{time_total}"',
        'header = "Content-Type: application/json"',
        "header = " + json.dumps("Authorization: Bearer " + key),
        "data = " + json.dumps(json.dumps(payload))]
    result = subprocess.run(["curl", "--config", "-"], input="\n".join(settings), text=True,
        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=50)
    try:
        body, timing = result.stdout.rsplit("\n", 1)
        code, tls, total = timing.split()
        return result.returncode, int(code), round(float(tls) * 1000), round(float(total) * 1000), body
    except (ValueError, TypeError):
        return result.returncode or 1, 0, None, None, ""


def valid_text(body):
    try:
        data = json.loads(body)
        if data.get("error"):
            return False
        text = data.get("choices", [{}])[0].get("message", {}).get("content")
        return isinstance(text, str) and bool(text.strip())
    except (ValueError, TypeError, IndexError, AttributeError):
        return False


def probe(definition, channel):
    ident, _, _, _, group, model, _ = definition
    result = {"id": ident, "timestamp": time.time(), "status": "error", "latencyMs": None,
        "pingMs": None, "reason": "configuration"}
    if not channel or channel["status"] != 1 or channel["type"] != 59:
        return result
    if channel["base_url"].rstrip("/") != ALLOWED_ORIGIN or group not in channel["group"].split(","):
        return result
    if model not in channel["models"].split(",") or channel.get("model_mapping") not in (None, "", "{}"):
        return result
    key = channel.get("key", "")
    if not key or "\n" in key or "\r" in key:
        return result
    payload = {"model": model, "messages": [{"role": "user", "content": "Reply only OK."}],
        "max_tokens": 256 if model == "kimi-k3" else 32, "stream": False}
    try:
        rc, code, tls, total, body = curl(ALLOWED_ORIGIN + "/v1/chat/completions", payload, key)
        result["pingMs"] = tls if tls else None
        result["latencyMs"] = total
        if rc == 28:
            result.update(status="failed", reason="timeout")
        elif rc:
            result.update(status="error", reason="network")
        elif code < 200 or code >= 300:
            result.update(status="failed", reason="http")
        elif not valid_text(body):
            result.update(status="failed", reason="empty")
        elif total is not None and total > 10000:
            result.update(status="degraded", reason="slow")
        else:
            result.update(status="operational", reason="ok")
    except (subprocess.TimeoutExpired, OSError):
        result.update(status="error", reason="network")
    result["timestamp"] = time.time()
    return result


def aggregate(rows, now, duration):
    selected = [r for r in rows if now - duration <= r["timestamp"] <= now]
    success = [r for r in selected if r["status"] in ("operational", "degraded")]
    latencies = [r["latencyMs"] for r in success if r["latencyMs"] is not None]
    bars = [None] * 60
    for row in selected:
        bucket = min(59, int((row["timestamp"] - (now - duration)) * 60 / duration))
        previous = bars[bucket]
        if previous is None or RANK[row["status"]] > RANK[previous]:
            bars[bucket] = row["status"]
    return {"availability": round(100 * len(success) / len(selected), 4) if selected else None,
        "averageLatencyMs": round(sum(latencies) / len(latencies)) if latencies else None,
        "samples": len(selected), "bars": bars}


def public_sample(row):
    return {"checkedAt": iso(row["timestamp"]), **{k: row[k] for k in
        ("status", "latencyMs", "pingMs", "reason")}}


def snapshot(db, channels, now):
    first = db.execute("select min(timestamp) from checks").fetchone()[0] or now
    records = []
    for definition in DEFINITIONS:
        ident, name, provider, channel_id, group, model, monitored = definition
        channel = channels.get(channel_id)
        config = "configured" if monitored and channel else "unmonitored" if channel else "unconfigured"
        rows = [dict(r) for r in db.execute("select * from checks where channel=? and timestamp>=? order by timestamp", (ident, now - 30 * 86400))]
        records.append({"id": ident, "name": name, "provider": provider, "model": model,
            "configuration": config, "latest": public_sample(rows[-1]) if rows else None,
            "recent": [public_sample(r) for r in rows[-60:]],
            "windows": {key: aggregate(rows, now, seconds) for key, seconds in WINDOWS.items()}})
    return {"version": 2, "source": "apic-channel-upstream", "generatedAt": iso(now),
        "startedAt": iso(first), "intervalSeconds": INTERVAL, "records": records}


def run():
    ROOT.mkdir(parents=True, exist_ok=True)
    with open(ROOT / "collector.lock", "w") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return
        channels = read_channels()
        db = sqlite3.connect(ROOT / "history.sqlite3")
        db.row_factory = sqlite3.Row
        db.execute("create table if not exists checks (channel text, timestamp real, status text, latencyMs integer, pingMs integer, reason text)")
        db.execute("create index if not exists checks_channel_time on checks(channel,timestamp)")
        last = db.execute("select max(timestamp) from checks").fetchone()[0]
        if last is not None and time.time() - last < INTERVAL - 60:
            print("collector: recent checks already present")
            return
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
            futures = [pool.submit(probe, d, channels.get(d[3])) for d in DEFINITIONS if d[6]]
            for future in futures:
                result = future.result()
                db.execute("insert into checks values (?,?,?,?,?,?)", (result["id"], result["timestamp"], result["status"], result["latencyMs"], result["pingMs"], result["reason"]))
        db.commit()
        payload = snapshot(db, channels, time.time())
        target = ROOT / "public"
        target.mkdir(mode=0o755, exist_ok=True)
        fd, temp = tempfile.mkstemp(dir=target, prefix=".snapshot-")
        with os.fdopen(fd, "w") as out:
            json.dump(payload, out, separators=(",", ":"))
            out.flush()
            os.fsync(out.fileno())
        os.chmod(temp, 0o644)
        os.replace(temp, target / "snapshot.json")
        print("collector:", ", ".join(r["name"] + "=" + (r["latest"]["status"] if r["latest"] else r["configuration"]) for r in payload["records"]))
        db.close()


if __name__ == "__main__":
    try:
        run()
    except Exception:
        print("collector failed; previous snapshot retained", flush=True)
        raise SystemExit(1)
