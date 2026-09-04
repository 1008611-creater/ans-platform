#!/usr/bin/env python3
"""Create durable project memory files for website and mini program work."""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


VALID_PROJECT_TYPES = {
    "website",
    "mini_program",
    "h5",
    "web_app",
    "dashboard",
    "portfolio",
    "landing_page",
}
MINIAPP_STACKS = {"wechat_native", "taro", "uni_app"}
WEBSITE_ROUTES = {"framer", "nextjs", "static_site", "existing_repo"}
COMMON_DIRS = [
    "docs",
    "docs/strategy",
    "docs/design",
    "docs/verification",
    "artifacts",
    "artifacts/screenshots",
]
WEBSITE_DIRS = [
    "docs/seo",
    "docs/analytics",
    "docs/cro",
    "docs/accessibility",
    "docs/performance",
    "docs/observability",
    "docs/security",
    "docs/content",
    "docs/database",
    "docs/backend",
    "docs/admin",
    "docs/source-reuse",
    "docs/ui",
    "docs/deployment",
    "artifacts/website",
    "artifacts/website/assets",
    "public",
    "public/assets",
    "tests",
    "tests/playwright",
]
MINIAPP_DIRS = [
    "docs/wechat",
    "docs/payment",
    "docs/privacy",
    "docs/cloud",
    "docs/admin",
    "docs/source-reuse",
    "docs/ui",
    "artifacts/miniapp",
    "artifacts/miniapp/assets",
    "miniprogram",
]


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return slug or "project"


def csv_values(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def parse_subpackage(value: str) -> dict[str, Any]:
    root, sep, pages = value.partition(":")
    if not sep:
        return {"root": root.strip(), "pages": []}
    return {"root": root.strip(), "pages": csv_values(pages)}


def parse_source_repo(value: str) -> dict[str, Any]:
    """Parse name|url|ref|used_for_csv|status source repo records."""
    parts = [part.strip() for part in value.split("|")]
    while len(parts) < 5:
        parts.append("")
    return {
        "name": parts[0],
        "url": parts[1],
        "locked_ref": parts[2],
        "used_for": csv_values(parts[3]),
        "status": parts[4] or "candidate",
        "local_path": "",
    }


def skill_dir() -> Path:
    return Path(__file__).resolve().parents[1]


def load_template(name: str) -> str:
    path = skill_dir() / "assets" / "templates" / name
    if not path.exists():
        raise FileNotFoundError(f"template_not_found:{path}")
    return path.read_text(encoding="utf-8")


def load_manifest_template() -> dict[str, Any]:
    return json.loads(load_template("PROJECT_MANIFEST.json"))


def default_implementation_route(project_type: str) -> str:
    if project_type == "mini_program":
        return "wechat_native"
    if project_type in {"web_app", "dashboard"}:
        return "nextjs"
    if project_type in {"portfolio", "landing_page", "h5"}:
        return "static_site"
    return "nextjs"


def render_design(template: str, args: argparse.Namespace) -> str:
    replacements = {
        "- Product:": f"- Product: {args.project_name}",
        "- Target user:": f"- Target user: {args.target_user}",
        "- Primary action:": f"- Primary action: {args.primary_action}",
        "- Platform:": f"- Platform: {args.project_type}",
        "- Direction:": f"- Direction: {args.design_direction}",
        "- Avoid:": f"- Avoid: {args.design_avoid}",
        "- Forms:": f"- Forms: {args.form_destination}",
        "- Accessibility checks:": "- Accessibility checks: keyboard, focus, contrast, axe/pa11y when feasible",
        "- Screenshot checks:": "- Screenshot checks: desktop and mobile browser evidence",
        "- Mobile checks:": "- Mobile checks: no overlap, clipping, hidden primary action",
    }
    lines = []
    for line in template.splitlines():
        stripped = line.strip()
        lines.append(replacements.get(stripped, line))
    return "\n".join(lines).rstrip() + "\n"


def build_manifest(args: argparse.Namespace) -> dict[str, Any]:
    manifest = load_manifest_template()
    now = utc_now()
    implementation_route = args.implementation_route or default_implementation_route(args.project_type)

    manifest.update(
        {
            "project_id": args.project_id or slugify(args.project_name),
            "project_name": args.project_name,
            "created_at": now,
            "updated_at": now,
            "project_type": args.project_type,
            "owner_goal": args.owner_goal,
            "target_user": args.target_user,
            "current_phase": args.current_phase,
            "status": "active",
        }
    )

    route = manifest.setdefault("route", {})
    route["top_router"] = "web-miniapp-product-router"
    route["design_router"] = "frontend-product-design-router"
    route["design_source_of_truth"] = args.source_of_truth
    route["implementation_route"] = implementation_route

    manifest["source_repositories"] = [parse_source_repo(item) for item in args.source_repo]
    manifest.setdefault("source_application_records", [])

    artifacts = manifest.setdefault("artifacts", {})
    artifacts["design_md"] = "DESIGN.md"
    artifacts["code_root"] = args.code_root

    if args.project_type == "mini_program":
        if implementation_route not in MINIAPP_STACKS:
            raise ValueError(f"mini_program_requires_miniapp_route:{implementation_route}")
        route["specialist_router"] = "miniapp-product-router"
        route["website_router"] = ""
        route["quality_router"] = ""
        miniapp = manifest.setdefault("miniapp", {})
        miniapp.update(
            {
                "appid": args.appid,
                "stack": implementation_route,
                "component_system": args.component_system,
                "devtools_project_path": args.devtools_project_path,
                "miniprogram_root": args.miniprogram_root,
                "base_lib_version": args.base_lib_version,
                "version": args.version,
                "pages": csv_values(args.pages),
                "tabbar_pages": csv_values(args.tabbar_pages),
                "subpackages": [parse_subpackage(item) for item in args.subpackage],
                "required_capabilities": csv_values(args.required_capabilities),
                "privacy_required": args.privacy_required,
            }
        )
        miniapp.setdefault("legal_domains", {}).update(
            {
                "request": csv_values(args.request_domains),
                "upload": csv_values(args.upload_domains),
                "download": csv_values(args.download_domains),
                "socket": csv_values(args.socket_domains),
            }
        )
        miniapp["backend_api"] = {
            "login_endpoint": args.login_endpoint,
            "upload_endpoint": args.upload_endpoint,
            "payment_create_order": args.payment_create_order,
            "payment_notify_url": args.payment_notify_url,
        }
        miniapp["wechat_pay"] = {
            "mchid": args.mchid,
            "merchant_cert_configured": args.merchant_cert_configured,
            "sandbox_or_test_plan": args.payment_test_plan,
            "notify_route_confirmed": bool(args.payment_notify_url),
            "payment_ready": False,
        }
        miniapp.setdefault("cloud", {}).update(
            {
                "provider": args.cloud_provider,
                "env_id": args.cloud_env_id,
                "database": bool(args.cloud_provider or args.cloud_env_id or args.cloud_collections),
                "collections": csv_values(args.cloud_collections),
                "cloud_functions": csv_values(args.cloud_functions),
                "storage_bucket": args.cloud_storage_bucket,
                "security_rules_recorded": False,
            }
        )
        miniapp.setdefault("admin", {}).update(
            {
                "required": args.admin_required,
                "route": args.admin_route,
                "url": args.admin_url,
                "api_base_url": args.api_base_url,
                "smoke_test_record": "",
            }
        )
        miniapp.setdefault("generated_assets", [])
        gates = manifest.setdefault("quality_gates", {})
        gates["miniapp_runtime_gate"] = "pending"
        gates["launch_gate"] = "pending"
        gates["source_application_gate"] = "pending"
        gates["miniapp_ui_quality_gate"] = "pending"
        gates["cloud_database_gate"] = "pending"
        gates["admin_gate"] = "pending"
    else:
        if implementation_route not in WEBSITE_ROUTES:
            raise ValueError(f"website_requires_website_route:{implementation_route}")
        route["specialist_router"] = ""
        route["website_router"] = "website-product-router"
        route["quality_router"] = "website-quality-router" if args.quality_verticals else ""

        website = manifest.setdefault("website", {})
        website.update(
            {
                "website_kind": args.website_kind,
                "runtime": implementation_route,
                "source_of_truth": args.source_of_truth,
                "quality_verticals": csv_values(args.quality_verticals),
                "visible_value_path": args.visible_value_path,
                "primary_conversion": args.primary_conversion,
                "form_destination": args.form_destination,
                "accessibility_standard": args.accessibility_standard,
            }
        )
        website.setdefault("performance_budget", {}).update(
            {
                "lcp": args.lcp_budget,
                "inp": args.inp_budget,
                "cls": args.cls_budget,
                "js_budget_kb": args.js_budget_kb,
                "image_budget_kb": args.image_budget_kb,
            }
        )
        website.setdefault("forms", {}).update(
            {
                "library": args.form_library,
                "schema_validation": args.schema_validation,
                "server_action_or_endpoint": args.form_destination,
                "spam_protection": args.spam_protection,
            }
        )
        website.setdefault("i18n", {}).update(
            {
                "locales": csv_values(args.locales),
                "default_locale": args.default_locale,
                "library": args.i18n_library,
                "localized_routes": bool(args.locales),
                "localized_metadata": bool(args.locales),
            }
        )
        website.setdefault("security", {}).update(
            {
                "csp": args.csp,
                "cookie_consent": args.cookie_consent,
            }
        )
        website.setdefault("content", {}).update(
            {
                "cms": args.cms,
                "content_source": args.content_source,
                "asset_optimization": args.asset_optimization,
                "image_strategy": args.image_strategy,
                "video_strategy": args.video_strategy,
            }
        )
        website.setdefault("component_system", {}).update(
            {
                "library": args.component_system,
                "storybook": args.storybook,
                "visual_regression": args.visual_regression,
                "design_tokens": args.design_tokens,
            }
        )
        website.setdefault("database", {}).update(
            {
                "provider": args.database_provider,
                "url_env": args.database_url_env,
                "tables": csv_values(args.database_tables),
                "migrations_path": args.database_migrations_path,
                "security_rules_recorded": args.database_security_rules_recorded,
            }
        )

        website.setdefault("backend_api", {}).update(
            {
                "base_url": args.backend_base_url,
                "auth_provider": args.auth_provider,
                "upload_endpoint": args.website_upload_endpoint,
                "payment_create_order": args.website_payment_create_order,
                "payment_notify_url": args.website_payment_notify_url,
            }
        )

        website.setdefault("admin", {}).update(
            {
                "required": args.website_admin_required,
                "route": args.website_admin_route,
                "url": args.website_admin_url,
                "smoke_test_record": args.website_admin_smoke_test_record,
            }
        )

        website.setdefault("ci", {}).update(
            {
                "build": args.build_command,
                "lint": args.lint_command,
                "typecheck": args.typecheck_command,
                "test": args.test_command,
                "preview": args.preview_command,
            }
        )

        deployment = manifest.setdefault("deployment", {})
        deployment.update(
            {
                "provider": args.deployment_provider,
                "preview_url": args.preview_url,
                "production_url": args.production_url,
                "domain": args.domain,
                "build_command": args.build_command,
                "output_directory": args.output_directory,
                "env_vars_required": csv_values(args.env_vars_required),
            }
        )
        manifest.setdefault("seo", {}).update(
            {
                "title": args.seo_title,
                "description": args.seo_description,
                "canonical": args.canonical,
            }
        )
        manifest.setdefault("analytics", {}).update(
            {
                "provider": args.analytics_provider,
                "measurement_id": args.measurement_id,
                "events": csv_values(args.analytics_events),
                "event_taxonomy": args.event_taxonomy,
            }
        )

    manifest["decision_history"].append(
        {
            "at": now,
            "decision": "created_project_scaffold",
            "route": implementation_route,
            "source": "create_project_scaffold.py",
        }
    )
    return manifest


def scaffold_dirs(project_type: str) -> list[str]:
    dirs = list(COMMON_DIRS)
    dirs.extend(MINIAPP_DIRS if project_type == "mini_program" else WEBSITE_DIRS)
    return dirs


def write_scaffold(args: argparse.Namespace) -> int:
    root = Path(args.root).expanduser().resolve()
    project_dir = root / slugify(args.project_name)
    manifest_path = project_dir / "PROJECT_MANIFEST.json"
    design_path = project_dir / "DESIGN.md"

    if project_dir.exists() and not args.force and not args.dry_run:
        print(f"project_exists:{project_dir}", file=sys.stderr)
        return 1

    try:
        manifest = build_manifest(args)
        design = render_design(load_template("DESIGN.md"), args)
    except (FileNotFoundError, ValueError, json.JSONDecodeError) as exc:
        print(f"error:{exc}", file=sys.stderr)
        return 1

    dirs = scaffold_dirs(args.project_type)
    if args.dry_run:
        print(f"project_dir:{project_dir}")
        print(f"manifest:{manifest_path}")
        print(f"design:{design_path}")
        for directory in dirs:
            print(f"dir:{project_dir / directory}")
        return 0

    project_dir.mkdir(parents=True, exist_ok=True)
    for directory in dirs:
        (project_dir / directory).mkdir(parents=True, exist_ok=True)

    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    design_path.write_text(design, encoding="utf-8")
    print(f"created:{project_dir}")
    print(f"manifest:{manifest_path}")
    print(f"design:{design_path}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=".", help="Directory where the project folder will be created.")
    parser.add_argument("--project-name", required=True)
    parser.add_argument("--project-id", default="")
    parser.add_argument("--project-type", choices=sorted(VALID_PROJECT_TYPES), default="website")
    parser.add_argument("--owner-goal", default="")
    parser.add_argument("--target-user", default="")
    parser.add_argument("--primary-action", default="")
    parser.add_argument("--current-phase", choices=["intake", "strategy", "architecture", "design", "build", "verify", "launch", "iterate"], default="intake")
    parser.add_argument("--implementation-route", default="")
    parser.add_argument("--source-of-truth", default="code")
    parser.add_argument("--code-root", default="")
    parser.add_argument("--component-system", default="")
    parser.add_argument("--design-direction", default="")
    parser.add_argument("--design-avoid", default="")
    parser.add_argument("--source-repo", action="append", default=[], help="Format: name|url|ref|used_for_csv|status")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--dry-run", action="store_true")

    website = parser.add_argument_group("website")
    website.add_argument("--website-kind", default="")
    website.add_argument("--quality-verticals", default="")
    website.add_argument("--visible-value-path", default="")
    website.add_argument("--primary-conversion", default="")
    website.add_argument("--form-destination", default="")
    website.add_argument("--accessibility-standard", default="WCAG 2.2 AA")
    website.add_argument("--lcp-budget", default="")
    website.add_argument("--inp-budget", default="")
    website.add_argument("--cls-budget", default="")
    website.add_argument("--js-budget-kb", default="")
    website.add_argument("--image-budget-kb", default="")
    website.add_argument("--form-library", default="")
    website.add_argument("--schema-validation", default="")
    website.add_argument("--spam-protection", default="")
    website.add_argument("--locales", default="")
    website.add_argument("--default-locale", default="")
    website.add_argument("--i18n-library", default="")
    website.add_argument("--csp", default="")
    website.add_argument("--cookie-consent", default="")
    website.add_argument("--cms", default="")
    website.add_argument("--content-source", default="")
    website.add_argument("--asset-optimization", default="")
    website.add_argument("--image-strategy", default="")
    website.add_argument("--video-strategy", default="")
    website.add_argument("--storybook", default="")
    website.add_argument("--visual-regression", default="")
    website.add_argument("--design-tokens", default="")
    website.add_argument("--deployment-provider", default="")
    website.add_argument("--preview-url", default="")
    website.add_argument("--production-url", default="")
    website.add_argument("--domain", default="")
    website.add_argument("--build-command", default="")
    website.add_argument("--lint-command", default="")
    website.add_argument("--typecheck-command", default="")
    website.add_argument("--test-command", default="")
    website.add_argument("--preview-command", default="")
    website.add_argument("--output-directory", default="")
    website.add_argument("--env-vars-required", default="")
    website.add_argument("--seo-title", default="")
    website.add_argument("--seo-description", default="")
    website.add_argument("--canonical", default="")
    website.add_argument("--analytics-provider", default="")
    website.add_argument("--measurement-id", default="")
    website.add_argument("--analytics-events", default="")
    website.add_argument("--event-taxonomy", default="")
    website.add_argument("--database-provider", default="")
    website.add_argument("--database-url-env", default="")
    website.add_argument("--database-tables", default="")
    website.add_argument("--database-migrations-path", default="")
    website.add_argument("--database-security-rules-recorded", action="store_true")
    website.add_argument("--backend-base-url", default="")
    website.add_argument("--auth-provider", default="")
    website.add_argument("--website-upload-endpoint", default="")
    website.add_argument("--website-payment-create-order", default="")
    website.add_argument("--website-payment-notify-url", default="")
    website.add_argument("--website-admin-required", action="store_true")
    website.add_argument("--website-admin-route", default="")
    website.add_argument("--website-admin-url", default="")
    website.add_argument("--website-admin-smoke-test-record", default="")

    miniapp = parser.add_argument_group("miniapp")
    miniapp.add_argument("--appid", default="")
    miniapp.add_argument("--devtools-project-path", default="")
    miniapp.add_argument("--miniprogram-root", default="miniprogram")
    miniapp.add_argument("--base-lib-version", default="")
    miniapp.add_argument("--version", default="0.1.0")
    miniapp.add_argument("--pages", default="")
    miniapp.add_argument("--tabbar-pages", default="")
    miniapp.add_argument("--subpackage", action="append", default=[])
    miniapp.add_argument("--required-capabilities", default="")
    miniapp.add_argument("--privacy-required", action="store_true")
    miniapp.add_argument("--request-domains", default="")
    miniapp.add_argument("--upload-domains", default="")
    miniapp.add_argument("--download-domains", default="")
    miniapp.add_argument("--socket-domains", default="")
    miniapp.add_argument("--login-endpoint", default="")
    miniapp.add_argument("--upload-endpoint", default="")
    miniapp.add_argument("--payment-create-order", default="")
    miniapp.add_argument("--payment-notify-url", default="")
    miniapp.add_argument("--mchid", default="")
    miniapp.add_argument("--merchant-cert-configured", action="store_true")
    miniapp.add_argument("--payment-test-plan", default="")
    miniapp.add_argument("--cloud-provider", default="")
    miniapp.add_argument("--cloud-env-id", default="")
    miniapp.add_argument("--cloud-collections", default="")
    miniapp.add_argument("--cloud-functions", default="")
    miniapp.add_argument("--cloud-storage-bucket", default="")
    miniapp.add_argument("--admin-required", action="store_true")
    miniapp.add_argument("--admin-route", default="")
    miniapp.add_argument("--admin-url", default="")
    miniapp.add_argument("--api-base-url", default="")
    return parser


def main() -> int:
    return write_scaffold(build_parser().parse_args())


if __name__ == "__main__":
    sys.exit(main())
