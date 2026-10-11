"""Reject ANS candidates that omit the unified-credit endpoints and services.

This checks deployment completeness, not business correctness. It never starts
an application, connects a database, or calls a model provider.
"""
import argparse
import json
from pathlib import Path
import subprocess
import sys

ROUTES = (
    "/api/quota/history/route", "/api/quota/redeem/route",
    "/api/admin/credits/route", "/api/admin/credits/vouchers/route",
    "/api/admin/credits/requests/[id]/release/route",
    "/api/admin/credits/orders/[id]/refund/route",
    "/api/internal/credits/reconcile/route",
    "/api/codex/v1/models/route", "/api/codex/v1/responses/route",
    "/api/market/orders/[id]/pay/route", "/workspace/credits/page",
)
MODULES = (
    "src/server/quota/service.ts", "src/server/quota/history.ts",
    "src/server/quota/vouchers.ts", "src/server/quota/reconcile.ts",
    "src/server/quota/review.ts", "src/server/marketplace/points.ts",
    "src/server/integrations/apic-billing.ts",
    "src/server/integrations/codex-gateway.ts",
    "src/server/integrations/metered-cost.ts", "src/lib/credits-catalog.ts",
    "src/components/workspace/credits-center.tsx",
)

def source_errors(root):
    root = Path(root)
    paths = list(MODULES) + ["src/app" + route + "." + ("tsx" if route.endswith("/page") else "ts") for route in ROUTES]
    errors = ["CREDIT_SOURCE_MISSING:" + name for name in paths if not (root / name).is_file()]
    schema = root / "prisma/schema.prisma"
    if not schema.is_file():
        errors.append("CREDIT_SCHEMA_MISSING")
    else:
        content = schema.read_text(encoding="utf-8-sig")
        for model in ("QuotaLedger", "QuotaOperation", "CreditVoucher", "MarketPointsEscrow", "ApiComputeRequest"):
            if "model " + model + " {" not in content:
                errors.append("CREDIT_SCHEMA_MODEL_MISSING:" + model)
    return errors

def image_errors(image):
    # Fixed, secret-free script; argv carries only an image reference and routes.
    script = "const fs=require('node:fs');const paths=JSON.parse(fs.readFileSync('/app/.next/server/app-paths-manifest.json','utf8'));const wanted=JSON.parse(process.argv[1]);console.log(JSON.stringify(wanted.filter(p=>!paths[p]||!fs.existsSync('/app/.next/server/'+paths[p]))));"
    command = ["docker", "run", "--rm", "--pull", "never", "--network", "none", "--read-only", "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--entrypoint", "node", image, "-e", script, json.dumps(ROUTES)]
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=30)
        if result.returncode != 0:
            return ["CREDIT_IMAGE_INSPECTION_FAILED"]
        missing = json.loads(result.stdout)
        if not isinstance(missing, list) or not all(isinstance(x, str) for x in missing):
            return ["CREDIT_IMAGE_INSPECTION_FAILED"]
        return ["CREDIT_IMAGE_ROUTE_MISSING:" + name for name in missing]
    except (OSError, ValueError, subprocess.TimeoutExpired):
        return ["CREDIT_IMAGE_INSPECTION_FAILED"]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--source")
    group.add_argument("--image")
    args = parser.parse_args()
    errors = source_errors(args.source) if args.source else image_errors(args.image)
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print("CREDIT_IMPLEMENTATION_OK")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
