# Selection Examples

Use these examples when the right skill set is not obvious.

## Example: `seedance2` Image2 case-library admin safety work

Task:

- Improve `D:\codex-work\seedance2` around `/admin/image2-cases`
- Focus on change history, undo, or other production-safety behavior

Recommended selection by phase:

### Phase A: scope and spec

- `codex-agent-mem`
- `agent-team-workflow`

Why:

- The project is long-running and noisy, so continuity matters.
- The task has enough risk to justify spec, implementation, and review separation.

### Phase B: implementation

- `codex-agent-mem`
- `agent-team-workflow`
- `frontend-design` or `impeccable`

Why:

- The work touches a real admin UI and must remain usable for repeated operations.
- Use only one frontend quality skill unless the user explicitly asks for a broader design audit.

### Phase C: verification

- `codex-agent-mem`
- `agent-team-workflow`
- `playwright`

Why:

- Verification now matters more than design exploration.
- The third slot moves from design help to browser evidence.

## Example: research-heavy project thread

Task:

- Gather external references, compare approaches, and keep the result lightweight

Recommended skills:

- `codex-agent-mem`
- `jina-search`
- optional domain skill only if the project has a strong local specialization

Avoid:

- `agent-team-workflow` unless the research will directly hand off into implementation.
- frontend or browser skills unless the output includes a UI or page verification step.

## Example: OpenAI product/API guidance

Task:

- Answer how to use OpenAI models, images, or APIs with current official docs

Recommended skills:

- `openai-docs`
- `codex-agent-mem` only if this is part of a larger ongoing project

Avoid:

- `jina-search` as the default here when official OpenAI docs are sufficient.

## Example: project-local domain override

Task:

- Work on a domain with a strong project-local skill, such as ecommerce operations or a platform-specific workflow

Recommended pattern:

- `codex-agent-mem`
- project-local domain skill
- one of `jina-search`, `agent-team-workflow`, or `playwright` depending on the active phase

Rule:

Do not stack a global domain skill and a project-local domain skill unless they have clearly different roles.

## Example: Image2 commercial redesign quality pass

Task:

- Improve `D:\codex-work\seedance2` public `/image2-cases` from a generic case grid into a commercial ecommerce product-image tool
- Raise frontend design, copy, website architecture, and monetization quality

Recommended staged selection:

1. Product and site direction:
   - `codex-agent-mem`
   - `product-marketing`
   - `site-architecture`

2. Page copy and conversion:
   - `copywriting`; restore archived `ogilvy-copywriting` only when the user explicitly requests that framework
   - `cro`
   - `ux-writing`

3. Visual implementation:
   - `frontend-design` or `impeccable`
   - one craft skill such as `refactoring-ui`, `top-design`, or `make-interfaces-feel-better`
   - `playwright` or Browser plugin for screenshot review

4. Monetization moment:
   - `pricing`
   - `paywalls`
   - `analytics`

Avoid:

- Loading all design and marketing skills in one turn.
- Letting `top-design` override project constraints against generic AI gradients, one-note palettes, or decorative card-heavy layouts. `ui-ux-pro-max` is archived and must not be loaded unless explicitly restored.
- Implementing business code before the current project spec exists when the project requires three-window workflow.
