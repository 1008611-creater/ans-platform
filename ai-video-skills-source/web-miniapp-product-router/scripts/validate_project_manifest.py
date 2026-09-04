#!/usr/bin/env python3
"""Validate PROJECT_MANIFEST.json for website and WeChat mini program routes."""

from __future__ import annotations

import argparse
import json
import sys
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
WEBSITE_PROJECT_TYPES = VALID_PROJECT_TYPES - {"mini_program"}
VALID_PHASES = {"intake", "strategy", "architecture", "design", "build", "verify", "launch", "iterate"}
VALID_STATUS = {"planned", "active", "paused", "blocked", "complete", "archived"}
VALID_SOURCES = {"figma", "framer", "pixso", "motiff", "image2_concept", "code", "custom_bakery_brand", ""}
VALID_IMPLEMENTATION = {"framer", "nextjs", "static_site", "wechat_native", "taro", "uni_app", "existing_repo", ""}
MINIAPP_STACKS = {"wechat_native", "taro", "uni_app"}
GATE_VALUES = {"pending", "pass", "fail", "not_applicable"}
PRIVACY_CAPABILITIES = {
    "login",
    "payment",
    "upload",
    "location",
    "address",
    "member_card",
    "balance",
    "points",
    "coupon",
}
IMAGE2_ALLOWED_TARGETS = {
    "hero",
    "promo_banner",
    "vip_card",
    "product_image",
    "benefit_icon",
    "empty_state",
    "share_poster",
}
IMAGE2_FORBIDDEN_TARGETS = {
 "full_page_runtime_ui",
 "transparent_hotspot_navigation",
 "generated_tabbar",
}
WEBSITE_IMAGE_ALLOWED_TARGETS = {
 "hero",
 "section_art",
 "product_image",
 "brand_visual",
 "benefit_icon",
 "empty_state",
 "og_image",
 "share_poster",
}
WEBSITE_IMAGE_FORBIDDEN_TARGETS = {
 "full_page_runtime_ui",
 "transparent_hotspot_navigation",
 "generated_navbar",
 "generated_form",
 "generated_pricing_table",
 "generated_dashboard",
 "generated_admin_screen",
}
SOURCE_RECORD_TYPES = {"source_application", "source_repo_lock", "github_source_application"}

WEBSITE_GATE_RECORDS = {
    "website_quality_gate": (
        "website_quality_audit",
        "playwright_visual_check",
        "desktop_screenshot",
        "mobile_screenshot",
    ),
    "aesthetic_gate": ("website_quality_audit", "desktop_screenshot", "mobile_screenshot"),
    "visual_hierarchy_gate": ("website_quality_audit", "visual_hierarchy_review", "desktop_screenshot"),
    "ux_flow_gate": ("primary_flow_check", "ux_flow_check"),
    "function_gate": ("primary_flow_check", "function_check"),
    "seo_gate": ("seo_metadata_check",),
    "accessibility_gate": ("accessibility_audit", "axe_check", "pa11y_check"),
    "performance_gate": ("lighthouse_audit", "core_web_vitals_check", "performance_budget_check"),
    "analytics_gate": ("analytics_event_check",),
    "cro_gate": ("cro_review", "conversion_flow_check"),
    "experimentation_gate": ("experiment_check", "feature_flag_check"),
    "observability_gate": ("monitoring_check", "sentry_check", "error_monitoring_check"),
    "forms_gate": ("form_validation_check", "primary_flow_check"),
    "i18n_gate": ("i18n_check",),
 "security_gate": ("security_review", "owasp_check"),
 "content_gate": ("content_asset_check", "cms_check"),
 "database_gate": ("database_schema_check", "migration_check", "security_rules_check"),
 "backend_api_gate": ("api_smoke_test", "primary_flow_check"),
 "admin_gate": ("admin_smoke_test", "api_smoke_test"),
 "component_regression_gate": ("storybook_check", "visual_regression_check"),
    "ci_gate": ("ci_check", "build_check"),
    "deployment_gate": ("deployment_check", "reachable_url_check"),
    "playwright_visual_gate": (
        "playwright_visual_check",
        "desktop_screenshot",
        "mobile_screenshot",
    ),
}


def manifest_path(path_arg: str) -> Path:
    path = Path(path_arg).expanduser().resolve()
    if path.is_dir():
        path = path / "PROJECT_MANIFEST.json"
    return path


def load_manifest(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise TypeError("manifest_root_not_object")
    return data


def as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def has_value(mapping: dict[str, Any], key: str) -> bool:
    value = mapping.get(key)
    if isinstance(value, str):
        return bool(value.strip())
    return value not in (None, "", [], {})


def record_types(records: list[Any]) -> set[str]:
    return {
        str(record.get("type", "")).strip()
        for record in records
        if isinstance(record, dict) and str(record.get("type", "")).strip()
    }


def has_record_type(records: list[Any], *types: str) -> bool:
    available = record_types(records)
    return any(record_type in available for record_type in types)


def has_all_record_types(records: list[Any], *types: str) -> bool:
    available = record_types(records)
    return all(record_type in available for record_type in types)


def has_not_applicable_reason(records: list[Any], gate: str, not_done: list[Any]) -> bool:
    for record in records:
        if not isinstance(record, dict):
            continue
        if record.get("gate") == gate and str(record.get("reason", "")).strip():
            return True
        if record.get("type") == "not_applicable" and record.get("gate") == gate:
            return True
    for item in not_done:
        if isinstance(item, dict) and item.get("gate") == gate and str(item.get("reason", "")).strip():
            return True
        if isinstance(item, str) and gate in item:
            return True
    return False


def validate_source_application(data: dict[str, Any], quality_gates: dict[str, Any], errors: list[str], warnings: list[str]) -> None:
    repos = data.get("source_repositories", [])
    if not isinstance(repos, list):
        errors.append("source_repositories_not_list")
        repos = []

    records = data.get("source_application_records", [])
    if not isinstance(records, list):
        errors.append("source_application_records_not_list")
        records = []

    for index, repo in enumerate(repos):
        if not isinstance(repo, dict):
            errors.append(f"source_repository_not_object:{index}")
            continue
        name = str(repo.get("name", "")).strip()
        if not name:
            errors.append(f"source_repository_missing_name:{index}")
        if str(repo.get("status", "")).strip() == "applied":
            if not str(repo.get("locked_ref", "")).strip():
                warnings.append(f"applied_source_repository_missing_locked_ref:{name or index}")
            if not as_list(repo.get("used_for")):
                warnings.append(f"applied_source_repository_missing_used_for:{name or index}")

    applied_records = [record for record in records if isinstance(record, dict) and str(record.get("source", "")).strip()]
    if quality_gates.get("source_application_gate") == "pass" and not applied_records:
        errors.append("source_application_gate_pass_without_records")


def validate_common(data: dict[str, Any], errors: list[str], warnings: list[str]) -> None:
    project_type = str(data.get("project_type", "")).strip()
    if project_type not in VALID_PROJECT_TYPES:
        errors.append(f"invalid_project_type:{project_type}")

    phase = str(data.get("current_phase", "")).strip()
    if phase and phase not in VALID_PHASES:
        warnings.append(f"unknown_phase:{phase}")

    status = str(data.get("status", "")).strip()
    if status and status not in VALID_STATUS:
        warnings.append(f"unknown_status:{status}")

    route = data.get("route", {})
    if not isinstance(route, dict):
        errors.append("route_not_object")
        route = {}

    implementation = str(route.get("implementation_route", "")).strip()
    if implementation not in VALID_IMPLEMENTATION:
        errors.append(f"invalid_implementation_route:{implementation}")

    source = str(route.get("design_source_of_truth", "")).strip()
    if source not in VALID_SOURCES:
        warnings.append(f"unknown_design_source_of_truth:{source}")

    quality_gates = data.get("quality_gates", {})
    if not isinstance(quality_gates, dict):
        errors.append("quality_gates_not_object")
        quality_gates = {}
    else:
        for key, value in quality_gates.items():
            if key.endswith("_gate") and value not in GATE_VALUES:
                warnings.append(f"unknown_quality_gate_value:{key}:{value}")

    verification_records = data.get("verification_records", [])
    if not isinstance(verification_records, list):
        errors.append("verification_records_not_list")
        verification_records = []

    not_done = data.get("not_done", [])
    if not isinstance(not_done, list):
        errors.append("not_done_not_list")
        not_done = []

    if project_type in WEBSITE_PROJECT_TYPES:
        validate_website(data, route, quality_gates, verification_records, not_done, errors, warnings)

    validate_source_application(data, quality_gates, errors, warnings)


def validate_website(
    data: dict[str, Any],
    route: dict[str, Any],
    quality_gates: dict[str, Any],
    verification_records: list[Any],
    not_done: list[Any],
    errors: list[str],
    warnings: list[str],
) -> None:
    if route.get("website_router") != "website-product-router":
        warnings.append("website_router_missing")

    if route.get("quality_router") not in {"", "website-quality-router"}:
        warnings.append(f"unknown_quality_router:{route.get('quality_router')}")

    implementation = str(route.get("implementation_route", "")).strip()
    if implementation in MINIAPP_STACKS:
        errors.append(f"website_project_uses_miniapp_route:{implementation}")

    website = data.get("website", {})
    if not isinstance(website, dict):
        errors.append("website_not_object")
        website = {}

    if "quality_verticals" in website and not isinstance(website.get("quality_verticals"), list):
        errors.append("website_quality_verticals_not_list")

    image_policy = as_dict(website.get("image_asset_policy"))
    generated_assets = as_list(website.get("generated_assets"))
    database = as_dict(website.get("database"))
    backend_api = as_dict(website.get("backend_api"))
    admin = as_dict(website.get("admin"))

    if image_policy:
        if image_policy.get("framework_first_ui") is not True:
            errors.append("website_image_policy_framework_first_ui_not_true")
        if image_policy.get("fullscreen_screenshot_ui") is True:
            errors.append("website_image_policy_fullscreen_screenshot_ui_true")
        allowed = set(as_list(image_policy.get("allowed_targets")))
        forbidden = set(as_list(image_policy.get("forbidden_targets")))
        unknown_allowed = sorted(allowed - WEBSITE_IMAGE_ALLOWED_TARGETS)
        if unknown_allowed:
            warnings.append(f"website_image_policy_unknown_allowed_targets:{','.join(unknown_allowed)}")
        missing_forbidden = sorted(WEBSITE_IMAGE_FORBIDDEN_TARGETS - forbidden)
        if missing_forbidden:
            warnings.append(f"website_image_policy_missing_forbidden_targets:{','.join(missing_forbidden)}")

    if generated_assets and not image_policy:
        errors.append("website_generated_assets_without_image_asset_policy")
    for index, asset in enumerate(generated_assets):
        if not isinstance(asset, dict):
            errors.append(f"website_generated_asset_not_object:{index}")
            continue
        target = str(asset.get("target", "")).strip()
        if target and target not in WEBSITE_IMAGE_ALLOWED_TARGETS:
            errors.append(f"website_generated_asset_forbidden_target:{target}")
        if not str(asset.get("path", "")).strip():
            warnings.append(f"website_generated_asset_missing_path:{index}")

    analytics = as_dict(data.get("analytics"))
    if analytics.get("verified") is True and not has_value(analytics, "provider"):
        errors.append("analytics_verified_without_provider")
    if quality_gates.get("analytics_gate") == "pass" and not as_list(analytics.get("events")):
        warnings.append("analytics_gate_pass_without_events_list")

    deployment = as_dict(data.get("deployment"))
    if quality_gates.get("deployment_gate") == "pass":
        if not (has_value(deployment, "preview_url") or has_value(deployment, "production_url")):
            errors.append("deployment_gate_pass_without_url")

    if quality_gates.get("launch_gate") == "pass":
        if not (has_value(deployment, "production_url") or has_value(deployment, "preview_url")):
            errors.append("launch_gate_pass_without_reachable_url")

    if quality_gates.get("database_gate") == "pass":
        if not has_value(database, "provider"):
            errors.append("database_gate_pass_without_provider")
        if not as_list(database.get("tables")):
            errors.append("database_gate_pass_without_tables")
        if not has_value(database, "url_env"):
            warnings.append("database_gate_pass_without_url_env")
        if database.get("security_rules_recorded") is not True:
            warnings.append("database_gate_pass_without_security_rules_recorded")

    if quality_gates.get("backend_api_gate") == "pass":
        if not (
            has_value(backend_api, "base_url")
            or has_value(backend_api, "upload_endpoint")
            or has_value(backend_api, "payment_create_order")
        ):
            errors.append("backend_api_gate_pass_without_api_route")

    if quality_gates.get("admin_gate") == "pass":
        if not admin.get("required"):
            warnings.append("website_admin_gate_pass_but_admin_required_false")
        if not has_value(admin, "route") and not has_value(admin, "url"):
            errors.append("website_admin_gate_pass_without_route_or_url")
        if not has_value(admin, "smoke_test_record") and not has_record_type(verification_records, "admin_smoke_test"):
            errors.append("website_admin_gate_pass_without_smoke_test")

    for gate, required_types in WEBSITE_GATE_RECORDS.items():
        if quality_gates.get(gate) == "pass" and not has_record_type(verification_records, *required_types):
            errors.append(f"{gate}_pass_without_evidence")
        if quality_gates.get(gate) == "not_applicable" and not has_not_applicable_reason(
            verification_records, gate, not_done
        ):
            warnings.append(f"{gate}_not_applicable_without_reason")

    if quality_gates.get("responsive_gate") == "pass" and not has_all_record_types(
        verification_records, "desktop_screenshot", "mobile_screenshot"
    ):
        errors.append("responsive_gate_pass_without_desktop_and_mobile")

    if quality_gates.get("aesthetic_gate") == "pass" and not has_record_type(
        verification_records, "desktop_screenshot", "mobile_screenshot", "website_quality_audit"
    ):
        errors.append("aesthetic_gate_pass_without_visual_evidence")


def validate_subpackages(subpackages: list[Any], errors: list[str]) -> None:
    seen_roots: set[str] = set()
    for package in subpackages:
        if not isinstance(package, dict):
            errors.append("subpackage_not_object")
            continue
        root = str(package.get("root", "")).strip()
        if not root:
            errors.append("subpackage_missing_root")
            continue
        if root in seen_roots:
            errors.append(f"subpackage_duplicate_root:{root}")
        seen_roots.add(root)
        if not as_list(package.get("pages")):
            errors.append(f"subpackage_pages_empty:{root}")


def validate_miniapp(data: dict[str, Any], errors: list[str], warnings: list[str]) -> None:
    if data.get("project_type") != "mini_program":
        return

    route = as_dict(data.get("route"))
    if route.get("specialist_router") != "miniapp-product-router":
        warnings.append("miniapp_specialist_router_missing")

    implementation = str(route.get("implementation_route", "")).strip()
    if implementation not in MINIAPP_STACKS:
        errors.append(f"invalid_miniapp_implementation_route:{implementation}")

    miniapp = data.get("miniapp", {})
    if not isinstance(miniapp, dict):
        errors.append("miniapp_not_object")
        return

    stack = str(miniapp.get("stack", "")).strip()
    if stack != implementation:
        errors.append(f"miniapp_stack_mismatch:{stack}:{implementation}")

    if not str(miniapp.get("component_system", "")).strip():
        warnings.append("miniapp_component_system_missing")

    if not str(miniapp.get("appid", "")).strip():
        warnings.append("miniapp_appid_missing")

    devtools_path = str(miniapp.get("devtools_project_path", "")).strip()
    if not devtools_path:
        warnings.append("miniapp_devtools_project_path_missing")
    elif not Path(devtools_path).exists():
        warnings.append(f"miniapp_devtools_project_path_not_found:{devtools_path}")

    if not str(miniapp.get("miniprogram_root", "")).strip():
        warnings.append("miniapp_miniprogram_root_missing")

    pages = as_list(miniapp.get("pages"))
    if not pages:
        errors.append("miniapp_pages_empty")

    tabbar_pages = as_list(miniapp.get("tabbar_pages"))
    for page in [page for page in tabbar_pages if page not in pages]:
        errors.append(f"tabbar_page_not_in_pages:{page}")

    validate_subpackages(as_list(miniapp.get("subpackages")), errors)

    capabilities = set(as_list(miniapp.get("required_capabilities")))
    if PRIVACY_CAPABILITIES.intersection(capabilities) and not miniapp.get("privacy_required"):
        warnings.append("privacy_required_false_for_privacy_capabilities")

    legal_domains = as_dict(miniapp.get("legal_domains"))
    backend_api = as_dict(miniapp.get("backend_api"))
    wechat_pay = as_dict(miniapp.get("wechat_pay"))
    image2_policy = as_dict(miniapp.get("image2_asset_policy"))
    generated_assets = as_list(miniapp.get("generated_assets"))
    cloud = as_dict(miniapp.get("cloud"))
    admin = as_dict(miniapp.get("admin"))

    if "upload" in capabilities or has_value(miniapp, "upload_record"):
        if not as_list(legal_domains.get("upload")):
            warnings.append("upload_capability_missing:legal_domains.upload")
        if not has_value(backend_api, "upload_endpoint"):
            warnings.append("upload_capability_missing:backend_api.upload_endpoint")

    if "payment" in capabilities:
        for key in ["payment_create_order", "payment_notify_url"]:
            if not has_value(backend_api, key):
                warnings.append(f"payment_capability_missing:backend_api.{key}")
        for key in ["mchid", "sandbox_or_test_plan"]:
            if not has_value(wechat_pay, key):
                warnings.append(f"payment_capability_missing:wechat_pay.{key}")

    if wechat_pay.get("payment_ready") is True:
        for key in ["mchid", "sandbox_or_test_plan"]:
            if not has_value(wechat_pay, key):
                errors.append(f"payment_ready_without:wechat_pay.{key}")
        for key in ["payment_create_order", "payment_notify_url"]:
            if not has_value(backend_api, key):
                errors.append(f"payment_ready_without:backend_api.{key}")

    if image2_policy:
        if image2_policy.get("framework_first_ui") is not True:
            errors.append("image2_policy_framework_first_ui_not_true")
        if image2_policy.get("fullscreen_screenshot_ui") is True:
            errors.append("image2_policy_fullscreen_screenshot_ui_true")
        allowed = set(as_list(image2_policy.get("allowed_targets")))
        forbidden = set(as_list(image2_policy.get("forbidden_targets")))
        unknown_allowed = sorted(allowed - IMAGE2_ALLOWED_TARGETS)
        if unknown_allowed:
            warnings.append(f"image2_policy_unknown_allowed_targets:{','.join(unknown_allowed)}")
        missing_forbidden = sorted(IMAGE2_FORBIDDEN_TARGETS - forbidden)
        if missing_forbidden:
            warnings.append(f"image2_policy_missing_forbidden_targets:{','.join(missing_forbidden)}")

    if generated_assets and not image2_policy:
        errors.append("generated_assets_without_image2_asset_policy")

    for index, asset in enumerate(generated_assets):
        if not isinstance(asset, dict):
            errors.append(f"generated_asset_not_object:{index}")
            continue
        target = str(asset.get("target", "")).strip()
        if target and target not in IMAGE2_ALLOWED_TARGETS:
            errors.append(f"generated_asset_forbidden_target:{target}")
        if not str(asset.get("path", "")).strip():
            warnings.append(f"generated_asset_missing_path:{index}")

    preview_qr = str(miniapp.get("preview_qr", "")).strip()
    if preview_qr and Path(preview_qr).suffix.lower() not in {".jpg", ".jpeg", ".png"}:
        errors.append("preview_qr_not_image_file")

    quality_gates = as_dict(data.get("quality_gates"))
    records = as_list(data.get("verification_records"))
    if quality_gates.get("miniapp_runtime_gate") == "pass" and not has_record_type(records, "devtools_preview"):
        errors.append("miniapp_runtime_gate_pass_without_devtools_preview")
    if quality_gates.get("miniapp_runtime_gate") == "pass" and not preview_qr:
        warnings.append("miniapp_runtime_gate_pass_without_preview_qr_field")
    if quality_gates.get("miniapp_ui_quality_gate") == "pass":
        if not has_record_type(records, "miniapp_ui_review", "real_device", "devtools_preview"):
            errors.append("miniapp_ui_quality_gate_pass_without_ui_evidence")
        if image2_policy and image2_policy.get("fullscreen_screenshot_ui") is not False:
            errors.append("miniapp_ui_quality_gate_pass_with_fullscreen_image2_ui")
    if quality_gates.get("cloud_database_gate") == "pass":
        if cloud.get("database") is not True:
            errors.append("cloud_database_gate_pass_without_database_true")
        if not as_list(cloud.get("collections")):
            errors.append("cloud_database_gate_pass_without_collections")
    if quality_gates.get("admin_gate") == "pass":
        if not admin.get("required"):
            warnings.append("admin_gate_pass_but_admin_required_false")
        if not has_value(admin, "route") and not has_value(admin, "url"):
            errors.append("admin_gate_pass_without_route_or_url")
        if not has_value(admin, "smoke_test_record") and not has_record_type(records, "admin_smoke_test"):
            errors.append("admin_gate_pass_without_smoke_test")

    if quality_gates.get("launch_gate") == "pass":
        if not has_value(miniapp, "upload_record"):
            errors.append("launch_gate_pass_without_upload_record")
        if str(miniapp.get("review_status", "")).strip() not in {"approved", "released"}:
            errors.append("launch_gate_pass_without_approved_review_status")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", help="Manifest path or project directory.")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    path = manifest_path(args.path)
    errors: list[str] = []
    warnings: list[str] = []

    if not path.exists():
        errors.append(f"manifest_not_found:{path}")
    else:
        try:
            data = load_manifest(path)
            validate_common(data, errors, warnings)
            validate_miniapp(data, errors, warnings)
        except json.JSONDecodeError as exc:
            errors.append(f"invalid_json:{exc}")
        except TypeError as exc:
            errors.append(str(exc))

    result = {"ok": not errors, "path": str(path), "errors": errors, "warnings": warnings}
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(f"path:{result['path']}")
        print(f"ok:{str(result['ok']).lower()}")
        for item in errors:
            print(f"error:{item}")
        for item in warnings:
            print(f"warning:{item}")
    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
