# Source Bench

Use this as the current external benchmark for prompt resources. These are not automatically loaded into a task; they explain why the local router is structured this way.

## Source Hierarchy

Prefer sources in this order:
1. Official model/provider docs for active channel behavior.
2. Original papers and official benchmark/project repos.
3. Curated GitHub prompt guides and case banks.
4. Community prompt libraries and social examples.

Do not promote lower-tier pattern when higher-tier source contradicts it.

## Checkpoint Source Grading

Use this matrix before importing a pattern:

| Source Class | Default Grade | Promotion Boundary |
|---|---|---|
| Current official provider docs | A | May update active-channel guidance after reading current page |
| Original paper plus official repo/project page | A | May add benchmark/eval dimension after local conversion |
| Original paper without practical repo or current channel match | B | Add experiment or QA idea, not active-channel default |
| Curated GitHub lists and prompt guides | C | Use for inspiration and examples only |
| Community prompt libraries | C | Extract role/checklist patterns only; never copy prompt prose |
| Viral/social prompt recipes | D | Trend signal only |
| User-designated creator course library with accessible full lessons | C | Extract directing patterns, role separation, examples, and failure checks; require project fit or local output evidence before changing defaults |

## Strong Sources

- OpenAI official prompt engineering and prompting docs: Grade A for OpenAI-channel prompt structure, instruction placement, iteration, and examples.
- Anthropic prompt engineering docs: Grade A for general prompt clarity, examples, structured prompts, chaining, and eval discipline; channel-specific claims stay Anthropic-only.
- GenEval official paper/repo: Grade A for object-focused image evaluation dimensions: object co-occurrence, position, count, and color.
- T2I-CompBench official paper/repo: Grade A for compositional image evaluation: attribute binding, object relationships, and complex compositions.
- VBench official project/repo: Grade A for video QA dimensions and prompt-suite thinking.
- Chain-of-Thought paper: Grade B for decomposition guidance because it informs reasoning workflow but should not force exposed chain-of-thought in user-facing prompts.
- ReAct paper/repo: Grade B for agent/tool workflow loops; use as source-truth/action/observation/gate discipline.
- YouMind-OpenLab `awesome-gpt-image-2`: very large GPT Image 2 prompt library with previews and multilingual coverage. Best as a case bank and inspiration source, not as a route controller.
- freestylefly `awesome-gpt-image-2`: industrial template and reverse-engineered case approach; useful for local `gpt-image-2-style-library` because it already exposes templates, categories, examples, and pitfalls.
- DAIR.AI `Prompt-Engineering-Guide`: strongest general LLM prompting reference for techniques, RAG, agents, prompt hubs, and factuality risks. Best for method education, not platform-native content production.
- `f/prompts.chat`: huge community prompt library. Useful for role/prompt examples, but quality is uneven and should not override domain-specific local skills.

## Weak Default Sources

- Bilibili prompt tutorials: useful for seeing current creator language and examples, but quality varies by creator, prompts are often single-formula, and many are model/channel-specific. Promote only after a pattern is tested locally.
- Viral social posts about prompts: use as idea signals, not as prompt truth.
- 刺猬星球/用户8848提示词教程资料库（2026-07-11 ingest）: Grade C. Strong for practical decomposition of assets, camera, light, motion, voice, and continuity; model/channel claims remain provisional. See `superi-prompt-course-20260711.md`.

## Selection Principle

Prefer a source that gives:
1. repeatable structure,
2. visible examples,
3. failure modes,
4. quality gates,
5. domain fit.

Do not prefer a source merely because it has many prompts.

## Practical Ranking

For Image2 visual quality:
1. local `gpt-image-2-style-library` for structured template selection;
2. YouMind-OpenLab for broad case inspiration and current examples;
3. `ciwei-prompt-method` for light, lens, scene identity, detail, and misunderstanding control;
4. `image2-boundary-lab` when the goal is a repeatable recipe rather than one image.

For platform-native Xiaohongshu:
1. `xiaohongshu-ops` for account, topic, structure, and platform behavior;
2. `xhs-traffic-aesthetic-guard` for visible text and carousel quality;
3. Image2 bases only for background/visual anchor prompts;
4. Bilibili only as a trend signal after filtering.

For general prompting:
1. local domain skill when one exists;
2. DAIR.AI for technique selection and evaluation loops;
3. prompts.chat for role/checklist examples only;
4. ad hoc prompting only for low-risk one-off tasks.
