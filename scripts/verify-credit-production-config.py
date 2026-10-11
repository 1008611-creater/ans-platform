"""Validate rendered Compose billing configuration without logging secrets."""
import argparse
import json
import sys
from urllib.parse import urlsplit


def validate(document, service="app", require_unified=False):
    errors = []
    configuration = document.get("services", {}).get(service)
    if not isinstance(configuration, dict):
        return ["APP_SERVICE_MISSING"]
    environment = configuration.get("environment", {})
    if isinstance(environment, list):
        environment = dict(entry.split("=", 1) for entry in environment if isinstance(entry, str) and "=" in entry)
    if not isinstance(environment, dict):
        return ["APP_ENVIRONMENT_INVALID"]
    env = {name: str(value).strip() if value is not None else "" for name, value in environment.items()}
    flags = ("ANS_UNIFIED_POINTS_ENABLED", "ANS_APIC_BILLING_ENABLED", "ANS_CODEX_GATEWAY_ENABLED")
    for flag in flags:
        if env.get(flag, "") not in ("", "0", "1"):
            errors.append(flag + "_INVALID")
        if require_unified and env.get(flag) != "1":
            errors.append(flag + "_REQUIRED")
    billing = env.get("ANS_APIC_BILLING_ENABLED") == "1"
    gateway = env.get("ANS_CODEX_GATEWAY_ENABLED") == "1"
    if env.get("ANS_UNIFIED_POINTS_ENABLED") == "1" and not billing:
        errors.append("UNIFIED_POINTS_REQUIRES_APIC_BILLING")
    required = []
    urls = []
    if billing or gateway:
        required += ["RUN_API_KEY", "RUN_BASE_URL"]
        urls += ["RUN_BASE_URL"]
    if billing:
        required += ["APIC_COST_BRIDGE_URL", "APIC_COST_BRIDGE_SECRET"]
        urls += ["APIC_COST_BRIDGE_URL"]
    for name in required:
        if not env.get(name):
            errors.append(name + "_MISSING")
    for name in urls:
        if not env.get(name):
            continue
        try:
            parsed = urlsplit(env[name])
            valid = parsed.scheme in ("http", "https") and bool(parsed.hostname) and not parsed.username and not parsed.password and not parsed.query and not parsed.fragment
            parsed.port  # Reject malformed ports as well.
        except ValueError:
            valid = False
        if not valid:
            errors.append(name + "_INVALID")
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", nargs="?", help="Rendered Compose JSON; omit to read stdin")
    parser.add_argument("--service", default="app")
    parser.add_argument("--require-unified", action="store_true")
    args = parser.parse_args()
    try:
        if args.path:
            with open(args.path, encoding="utf-8-sig") as source:
                document = json.load(source)
        else:
            document = json.load(sys.stdin)
        errors = validate(document, args.service, args.require_unified)
    except (OSError, ValueError, AttributeError, TypeError):
        print("CREDITS_CONFIG_UNREADABLE", file=sys.stderr)
        return 1
    if errors:
        for error in errors:
            print(error, file=sys.stderr)
        return 1
    print("CREDITS_CONFIG_OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
