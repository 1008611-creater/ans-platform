# Research Ingestion Protocol

Use this file when improving prompt skill quality from GitHub, papers, official docs, benchmark suites, model release notes, or external prompt libraries.

## Source Tiers

Tier 1, primary sources:
- Official provider docs and prompt guides for active model/channel behavior.
- Original research papers and project pages.
- Official GitHub repos from the paper/project authors.
- Benchmark suites with prompts, scoring dimensions, code, and published methodology.

Tier 2, useful but not authoritative:
- Curated GitHub lists, community prompt libraries, course notes, and practitioner case banks.
- Use these for ideas and examples, not as production truth.

Tier 3, weak signal:
- Viral posts, screenshots, short tutorials, undocumented social media recipes, copied prompt packs.
- Use only as trend signal. Never promote without local validation.

## Source Grades

Use source tiers for broad priority, then assign a checkpoint grade for the exact claim being imported:

- `A`: primary and directly applicable now. Official provider docs for active channels, original benchmark project pages/repos, original papers with clear methodology.
- `B`: primary but indirect, dated, or not fully mapped to the active local provider/channel.
- `C`: curated/community source with useful examples but no authority over router defaults.
- `D`: weak trend signal such as social screenshots or copied prompt packs.

Only `A` and `B` sources may create new router defaults. `C` can create TODO experiments. `D` can only be listed as a trend to ignore or test later.

## Intake Checklist

For each candidate source, record:
- source name and URL;
- source type: official doc, paper, official repo, benchmark, case bank, community library;
- relevant domain: LLM prompt, Image2 still, character board, storyboard, video, agent/tool prompt, QA;
- extractable pattern: route decision, prompt contract, failure mode, eval dimension, model limitation, post-processing split;
- local application: which router route/contract/rubric should change;
- validation required before production promotion.

Reject sources that only provide vague adjectives, celebrity comparisons, unverified magic phrases, or prompts that depend on hidden model settings.

## Conversion Rules

External pattern must be converted into local contract:

```text
Observed external pattern:
Local route impact:
Prompt contract change:
QA dimension:
Failure mode controlled:
Production boundary:
Validation plan:
```

Do not copy long prompt prose. Keep only structural lesson.

Benchmark patterns must be converted into observable QA gates. For example, object-focused image benchmarks become checks for object presence, count, color/material binding, position, and co-occurrence. Video benchmarks become checks for subject consistency, motion smoothness, action consistency, temporal flicker, spatial relationships, and imaging quality.

## Paper To Skill Mapping

LLM prompting papers:
- CoT-style work maps to task decomposition and hidden reasoning discipline, not exposing chain-of-thought in final user prompts.
- ReAct-style work maps to tool-use loops: reason about source truth, act with tools, observe evidence, then decide next prompt.
- Self-consistency and eval-loop work maps to multi-candidate scoring, not blind "抽卡".

Text-to-image papers and benchmarks:
- GenEval-style object-focused evaluation maps to explicit checks for object presence, count, color, position, and attribute binding.
- T2I-CompBench-style compositional evaluation maps to prompt contracts that bind attributes to correct subject and separate spatial/non-spatial relationships.
- Prompt-to-Prompt-style attention findings map to stable-edit discipline: preserve source anchors and change only variable being tested.

Video generation benchmarks:
- VBench-style dimensions map to video QA: subject identity, motion smoothness, temporal flicker, spatial relationship, action consistency, dynamic degree, aesthetic quality, imaging quality.

## Promotion Rules

Promote into `SKILL.md` only when at least one is true:
- official provider behavior changed and directly affects active channels;
- paper/benchmark gives reusable QA dimension missing from current router;
- local production evidence shows repeated failures that pattern fixes;
- user explicitly asks make this pattern durable.

Keep source-specific detail in this reference file or dated research note. Keep `SKILL.md` short and operational.

## Current Priority Backlog

1. Image/video prompt QA dimensions from GenEval, T2I-CompBench, and VBench. Status: checkpointed into `benchmark-gates.md`; needs local production scoring examples.
2. Realistic character-board contracts for Mexican short-drama leads: visible facial structure, camera/light/material, ethnicity/localization, no accidental Chinese elements.
3. Text-in-image strategy: avoid generated dense text; route exact Chinese/Spanish copy to local overlay when precision matters.
4. Prompt version experiments: change one variable per rerun, record source prompt hash, candidate id, provider, seed/settings when available, output QA result.
5. Agent/tool prompts: route through source truth, action, observation, gate decision; avoid plan-only output being mistaken for production.

## Research Ledger 2026-06-30

These sources were ingested as structural guidance only. No community prompt prose was copied.

| Source | Grade | Imported Pattern | Local Use |
|---|---|---|---|
| OpenAI Prompt engineering / Prompting docs | A | Prompt quality depends on clear instructions, examples, role/tone placement, and iteration | Reinforces route-first contract, concise prompt shape, and validation loop |
| Anthropic prompt engineering overview / best practices | A | Prompt engineering is useful when success criteria are controllable by prompting; use clarity, examples, structured prompts, chaining, and evals | Adds source-grade discipline and eval-first thinking |
| Chain-of-Thought paper | B | Decomposition can improve complex reasoning | Maps to hidden task decomposition and concise user-facing schemas, not exposed private reasoning |
| ReAct paper / official repo | B | Interleave reasoning, tool action, observations, and decisions | Maps to source-truth -> action -> observation -> gate for agent/tool prompts |
| GenEval paper/repo | A | Object-focused checks: co-occurrence, position, count, color | Added image QA gates in `benchmark-gates.md` |
| T2I-CompBench paper/repo | A | Compositional checks: attribute binding, spatial/non-spatial relationships, complex compositions | Added compositional image prompt gate |
| VBench project/repo | A | Hierarchical video generation evaluation dimensions | Added video QA gate for subject, motion, temporal, spatial, and imaging checks |

## Seed Sources

- OpenAI prompt engineering guide: https://developers.openai.com/api/docs/guides/prompt-engineering
- Anthropic prompt engineering overview: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview
- DAIR Prompt Engineering Guide GitHub: https://github.com/dair-ai/prompt-engineering-guide
- Chain-of-Thought prompting paper: https://arxiv.org/abs/2201.11903
- ReAct paper: https://arxiv.org/abs/2210.03629
- Prompt-to-Prompt paper/project: https://arxiv.org/abs/2208.01626 and https://github.com/google/prompt-to-prompt/
- GenEval paper/repo: https://arxiv.org/abs/2310.11513 and https://github.com/djghosh13/geneval
- T2I-CompBench paper/repo: https://arxiv.org/abs/2307.06350 and https://github.com/Karine-Huang/T2I-CompBench
- VBench project/repo/paper: https://vchitect.github.io/VBench-project/ and https://github.com/Vchitect/VBench
