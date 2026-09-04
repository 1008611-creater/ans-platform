---
name: seedance2-a-contest-orchestrator
description: name: seedance2-a-contest-orchestrator
---

---
name: seedance2-a-contest-orchestrator
description: Orchestrate an all-AI Seedance2 plus Image2 contest-film workflow for award-oriented narrative entries. Use when the user wants an all-AI command-track film, a priority-A contest entry, or a routed workflow across research, asset building, shot execution, assembly, and submission prep.
---

## 硬性提示词语言规则

- 本 skill 产出的所有提示词、负向词、镜头生成指令、图像/视频模型 prompt，默认必须用中文撰写。
- 只有用户明确要求英文，或目标平台/API 的固定字段、参数名、模型保留词必须使用英文时，才保留英文；场景、动作、构图、质感、限制条件仍用中文。
- 不要先写英文提示词再附中文翻译；直接输出中文提示词。

# Seedance2 A Contest Orchestrator

Use this as the routing layer for your contest workflow.

## Default Assumptions

- contest type: `command track`;
- priority: `A`;
- production mode: `all-AI`;
- image generation: `Image2`;
- video generation: `Seedance2`;
- method baseline: prefer proven public workflows over self-exploration.

## Invocation Order

0. `ai-video-fundamentals-skill`
   - always first: story, hook, conflict, reversal, shot causality, first-frame readiness, and >5s tail-frame chain rules must pass before any Image2 or Seedance2 generation.
1. `ai-film-champion-method`
   - when the project needs a ruthless top-tier direction audit before generation.
2. `mx-shell-zombie-scavenger-research`
   - when the project needs proven external filmmaking methods.
3. `relic-collector-ip-system`
   - when the chosen project line is the Relic Collector IP.
4. `image2-narrative-firstframe`
   - when building character sheets, group boards, scene assets, and first frames.
5. `seedance2-narrative-shot-workflow`
   - when generating shot prompts from approved first frames.
6. optional editing/publishing skills
   - only after enough shots exist to support assembly and release.

## Contest Workflow

1. Confirm contest constraints and chosen lane.
2. Pick the story strategy:
   - high-concept world first;
   - character-first emotional hook;
   - premise-first command interpretation.
3. Research the closest proven public method.
4. Build the minimum viable asset pack:
   - protagonist identity sheet;
   - recurring side-character sheets;
   - key pairing/group boards;
   - 3 to 5 highest-risk first frames.
5. Generate proof-of-language shots:
   - one world-establishing shot;
   - one acting shot;
   - one tension shot;
   - one transition shot.
6. Audit what the system does well:
   - faces;
   - props;
   - movement;
   - audio;
   - text control.
7. Only then expand to the full film.

## Rules For This Orchestrator

- Do not start with a 2-minute full script if the visual world and character consistency are still unproven.
- Do not route into assets or Seedance2 prompts when the `ai-video-fundamentals-skill` story gate fails.
- Do not move to bulk shot generation before at least one first-frame-to-video loop has worked cleanly.
- Do not let "all-AI" become an excuse for weak directing. The prompts still need intention, rhythm, and editorial taste.
- Favor smaller validated loops over large speculative batches.

## What To Output

Depending on the user's ask, this skill should produce one of:

- a skill invocation plan;
- a production stage checklist;
- the next 3 concrete generation tasks;
- a shot-priority queue;
- a contest-ready making path from research to final assembly.

## References

- Read `references/routing-rules.md` when deciding which skill to invoke.
- Read `references/stage-checklist.md` when pushing the project forward step by step.
- Read `references/award-bar.md` and `references/direction-heuristics.md` for quality control.
