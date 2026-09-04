from __future__ import annotations

import hashlib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = [
    "SKILL.md",
    "agents/openai.yaml",
    "references/champion-routes.md",
    "references/prompt-contracts.md",
    "references/prompt-quality-rubric.md",
    "references/research-ingestion.md",
    "references/source-bench.md",
    "references/source-utilization.md",
    "references/benchmark-gates.md",
    "references/prompt-routing-contract.md",
    "references/prompt-method-system.md",
    "references/prompt-performance-ledger.md",
    "assets/prompt_routing_contract.template.json",
    "assets/prompt_method_cards.v1.json",
    "assets/ai_video_task_method_map.v1.json",
    "assets/prompt_lint_rules.v1.json",
    "assets/model_channel_method_profiles.v1.json",
    "assets/prompt_failure_recovery.v1.json",
    "assets/prompt_performance_event.template.json",
    "scripts/validate_prompt_routing_contract.py",
    "scripts/test_validate_prompt_routing_contract.py",
    "scripts/lint_prompt_routing_contract.py",
    "scripts/test_lint_prompt_routing_contract.py",
    "scripts/validate_prompt_performance_event.py",
    "scripts/summarize_prompt_performance.py",
    "scripts/test_prompt_performance_ledger.py",
    "references/superi-prompt-course-20260711.md",
    "VERSION_NOTES.md",
    "TODO.md",
]

REQUIRED_SKILL_SNIPPETS = [
    "Current live version: `v0.4.0-ai-video-prompt-compiler`",
    "Candidate method-system version: `v0.5.0-method-system-20260711`",
    "AI video routing boundary:",
    "## AI Video Prompt Compiler And Release Gate",
    "prompt_routing_contract.json",
    "provider_submit_allowed=false",
    "故事板不是 AI 视频的默认步骤",
    "Source grading rule:",
    "Benchmark conversion rule:",
    "references/benchmark-gates.md",
    "post-coding review",
    "Script-only N04 must be asset-first",
    "character_board_full_set",
]

REQUIRED_REFERENCE_SNIPPETS = {
    "references/research-ingestion.md": ["Source Grades", "Research Ledger 2026-06-30", "GenEval", "T2I-CompBench", "VBench"],
    "references/source-bench.md": ["Checkpoint Source Grading", "Default Grade", "Promotion Boundary"],
    "references/benchmark-gates.md": ["Source Grades", "Image Gates", "Video Gates", "Promotion Path"],
    "references/superi-prompt-course-20260711.md": ["Source Grade", "Validated Reusable Patterns", "Do Not Promote Without Evidence", "Lesson Index"],
    "references/prompt-routing-contract.md": ["Authority Precedence", "Three Layers", "Prompt Lock Requirements", "Stable Blockers", "provider_submit_allowed=false"],
    "references/prompt-method-system.md": ["Source And Authority Boundary", "Six Assets", "Prompt Lint Workflow", "Failure Recovery"],
    "references/prompt-performance-ledger.md": ["Evidence Rules", "executed_observation", "Validate And Summarize"],
}


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def require(condition: bool, message: str, errors: list[str]) -> None:
    if not condition:
        errors.append(message)


def main() -> int:
    errors: list[str] = []

    for rel in REQUIRED_FILES:
        path = ROOT / rel
        require(path.exists(), f"Missing required file: {rel}", errors)
        if path.exists():
            require(path.stat().st_size > 0, f"Required file is empty: {rel}", errors)

    skill_text = (ROOT / "SKILL.md").read_text(encoding="utf-8")
    for snippet in REQUIRED_SKILL_SNIPPETS:
        require(snippet in skill_text, f"SKILL.md missing snippet: {snippet}", errors)

    for rel, snippets in REQUIRED_REFERENCE_SNIPPETS.items():
        path = ROOT / rel
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        for snippet in snippets:
            require(snippet in text, f"{rel} missing snippet: {snippet}", errors)

    if errors:
        print("quick_validate: FAIL")
        for error in errors:
            print(f"- {error}")
        return 1

    print("quick_validate: PASS")
    for rel in REQUIRED_FILES:
        path = ROOT / rel
        print(f"{rel}\t{path.stat().st_size}\t{sha256(path)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
