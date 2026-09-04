# Benchmark Gates

Use this file when external image/video/agent benchmarks should become local QA gates. Benchmarks provide observable evaluation dimensions, not production prompt text.

## Source Grades

Grade every source before importing a pattern:

| Grade | Meaning | Allowed Use |
|---|---|---|
| A | Current official docs, original paper, official benchmark/project page, or official repo with methodology/code | Can change router guidance after local conversion |
| B | Primary source that is dated, indirect for this channel, or lacks current provider behavior | Can add QA dimensions or experiments |
| C | Curated GitHub list, course, prompt library, practitioner case bank | Inspiration and TODO only unless locally validated |
| D | Viral post, screenshot, copied prompt pack, undocumented recipe | Trend signal only |

Minimum record:

```text
source:
grade:
domain:
pattern:
local gate:
validation needed:
promotion decision:
```

## Image Gates From T2I Benchmarks

Use GenEval-style checks when an image prompt contains concrete objects:
- object presence: each named object is visible;
- count: requested number is plausible and not merged;
- color/material binding: attributes belong to the correct object;
- position: spatial relation is legible;
- co-occurrence: multiple requested objects appear together without substitution.

Use T2I-CompBench-style checks when a prompt is compositional:
- color, shape, and texture binding are tied to named subjects;
- spatial relationships are described with camera-friendly language;
- non-spatial relationships are converted into visible interaction;
- complex prompts are split into primary subject, secondary subject, environment, and constraint blocks.

Local acceptance:
- A prompt with two or more objects must name the primary subject and bind attributes directly to that subject.
- A prompt with spatial requirements must include camera/viewpoint and avoid ambiguous "beside/around" when exact layout matters.
- If dense readable text is required, route the text to local overlay unless the task explicitly accepts model text risk.

## Video Gates From VBench-Style Dimensions

For video, convert benchmark dimensions into a per-shot checklist:
- subject consistency: identity, wardrobe, props, and body scale remain stable;
- background consistency: scene geography does not jump without intent;
- motion smoothness: action has a start, continuation, and end state;
- dynamic degree: motion level matches the shot purpose;
- action consistency: the subject performs the requested action, not a visually adjacent action;
- temporal flicker: lighting/materials do not pulse distractingly;
- spatial relationship: characters/props keep plausible positions;
- aesthetic/imaging quality: framing, exposure, focus, and artifact level are acceptable.

Local acceptance:
- Storyboard-to-video prompts must bind key time points to storyboard frames when available.
- First-frame video prompts must specify which visual anchor is immutable and which motion variables may change.
- Provider execution remains outside the router unless an execution skill and approval boundary are selected.

## Agent And Prompt Workflow Gates

Use ReAct-style research as a workflow gate:
- identify source truth;
- act with tools only when evidence is needed;
- observe outputs;
- decide whether to draft, revise, execute, or stop.

Use chain-of-thought research as decomposition guidance, not as a requirement to reveal private reasoning. User-facing prompts should expose concise plans, checklists, schemas, or examples rather than hidden reasoning traces.

## Promotion Path

1. Record source grade and extracted pattern.
2. Convert the pattern into route, prompt contract, or QA gate language.
3. Validate on a narrow local task set.
4. Promote only the shortest operational rule into `SKILL.md`.
5. Keep source notes, failures, and benchmark detail in references or version notes.
