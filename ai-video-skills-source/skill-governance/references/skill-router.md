# Skill Router

## Routing Concept

Skill routing is a decision system, not a list of Skills to load. The router answers four separate questions in order:

1. **What is the requested artifact or state change?** A page, video, image, document, message, deployment, diagnosis, or governance change is the target. A Skill name is not the target.
2. **What phase is the work in?** Classify, plan, prepare, execute, verify, deliver, or compound. A Skill that is correct for preparation is not automatically correct for execution.
3. **Which one Skill owns the current phase?** Choose one primary route. Add at most one supporting Skill only when it produces a distinct artifact or quality check.
4. **What proves the result?** Bind the route to the smallest relevant tool/provider, authorization boundary, and evidence level. A plan, prompt, local preview, or submitted provider job is not a delivered artifact.

The stable user-facing model is:

```text
项目事实 -> 目标产物 -> 当前阶段 -> 一个主 Skill -> 至多一个辅助 Skill -> 工具/授权 -> 验证或交付
```

### Route Nodes

- **主 Skill**: owns the current transformation and completion gate.
- **辅助 Skill**: adds one distinct phase or quality check; it never becomes a second owner.
- **工具/Provider**: performs an operation selected by the Skill; it is not itself proof of completion.
- **验证/交付**: reads back the actual artifact or external state and determines whether the route can finish.

### Route Statuses

- `mandatory`: required by a project, user, system, plugin, or task-type rule.
- `user_designated`: explicitly preferred by the user; preference does not prove quality.
- `primary`: default specialist for a family with a clear scope.
- `supporting`: distinct phase or quality specialist; never a competing top-level route.
- `provisional_default`: current default while real-use evidence is still limited.
- `candidate`: installed and available, but not trusted for automatic routing until compared on real work.
- `explicit_only`: use only when named or when the narrow capability is unmistakably required.
- `archived`: retained for rollback or historical recovery; never auto-route.
- `unavailable_legacy`: registry compatibility record with no discoverable implementation; never auto-route.

`discovery_status` is separate from `routing_status`: a Skill can be discoverable but still be a candidate, and a remembered route can remain in the registry while unavailable. Never infer quality from discovery alone.

### The One-Owner Rule

Do not stack Skills because their descriptions share words such as “website”, “video”, “design”, “AI”, or “quality”. Stack only when the outputs differ:

```text
网站分类 -> 网站实现 -> 浏览器验收
视频方法 -> 一个渠道执行 -> 媒体 QA/交付
DOCX 文件 -> 渲染检查
```

If two Skills claim the same input, transformation, and completion gate, keep the route with stronger project authority, fresher evidence, narrower trigger, and lower context cost. Absorb a useful rule into the keeper only after same-input regression proves that the keeper still produces the required output.

### Completion States

- `structural`: files, route metadata, or contracts exist and validate.
- `integrated`: the selected path ran in a real local or authorized environment and its boundaries were read back.
- `real_delivery`: the requested artifact reached the user or external destination and the user-visible path was verified.
- `blocked`: a concrete missing input, authorization, external dependency, or observed failure prevents the next action.

Never use a higher state to summarize a lower one. In particular, provider submission, a passing HTTP check, a generated prompt, or a local preview cannot be called `real_delivery`.

Use this reference when multiple skills could trigger, when skill quality matters more than broad coverage, or when maintaining the installed skill set.

The router's job is to choose the smallest high-confidence set. More skills are not better; more accurate routing is better.

## Top-Level Domain Contract

Use `skill-routing-domains.json` as the machine-readable top level above the detailed family map. It defines 12 business domains and 8 cross-cutting control planes. Route in this fixed order:

```text
project and Source of Truth
-> requested outcome and final artifact
-> one routing domain
-> current phase
-> one method route
-> at most one distinct supporting specialist
-> one tool or provider execution route
-> external-effect and risk gates
-> structural, integrated, real_delivery, or blocked evidence
```

Do not create a generic top-level router merely to satisfy symmetry. Documents/data route directly by artifact, research routes directly by source, platform operations route directly by platform, and automation/control routes directly by intent. The domain contract records these as deliberate entry modes rather than missing routers.

## Capability Encapsulation

Treat a Skill route as a typed capability boundary, not as a bag of instructions:

```text
Input Packet
  project authority + objective + target artifact + current state + constraints + authorizations
-> Routing Decision
  domain + phase + primary route + optional distinct specialist + one execution route
-> Capability Execution
-> Output Packet
  artifact + decision + state change + evidence + remaining gate + provenance
```

The selected domain's `capability_contract` defines accepted inputs, the transformation, valid outputs, the completion gate, and outputs that must not be claimed. Reject or stop at the gate when a required input or authorization is missing. Do not return a generic success summary when the expected output packet cannot name an actual artifact and direct evidence.

## Priority Ladder

Apply these priorities in order:

1. Mandatory rules: system/developer instructions, user-named skills, project `AGENTS.md`, and explicit plugin/tool rules.
2. Mandatory prerequisites: examples include `figma-use` before any `use_figma` call, Browser plugin for explicit in-app browser/local target requests, and `openai-docs` for OpenAI product/API guidance.
3. User-designated champion truth: for a finalized script's P0/P0A analysis, P1 creative baseline, realistic character masters/sheets, and key-prop masters, use `chaoge-assets-trial`; for broader AI video, Image2 assets for video, or Seedance2 production/diagnosis, `ai-video-fundamentals-skill` remains the top-priority method layer.
4. Project-local or platform-specific truth: use the narrow platform or project skill when the user is working inside that platform, tool, repo, or workflow.
5. Evidence-backed champions: skills whose real-use records meet the promotion threshold.
6. Narrow specialist skills: use only when the artifact, platform, or file type matches exactly.
7. Provisional defaults and candidate bench skills: use only when they add a distinct perspective not covered above, then score real outcomes.
8. Explicit-only/archive skills: use only when the user names them or when no better active skill covers the task.

## Selection Budget

- Tiny answer or one command: 0-1 skill.
- Normal task: 1-2 skills.
- Substantial implementation, research, or content workflow: 2-3 skills.
- More than 3 skills only for a skill audit, a multi-phase workflow, or an explicit user request.

Choose by phase **and then by concrete node/artifact**. A project or phase
router is a control envelope, not a professional Skill that stays active from
the beginning to the end of the phase. Re-route when the work changes from
planning to UI implementation, accessibility, metadata, motion, provider
selection, media QA, browser verification, or delivery readback. Do not keep a
planning skill active during verification unless it still adds value.

## Routing Algorithm

1. List candidate skills from the user request, project rules, and skill metadata.
2. Add any mandatory prerequisite from the priority ladder.
3. Score each candidate:

   ```text
   score =
     trigger_accuracy * 4
   + domain_fit * 3
   + historical_quality * 3
   + context_efficiency * 2
   + evidence_quality * 2
   + bounded_github_source_prior
   - unproven_internal_skill_penalty
   - overlap_penalty * 3
   - noise_penalty * 2
   ```

4. Apply family conflict rules from `skill-families.md`.
5. Keep the top 1-3 skills whose roles are clearly different.
6. If two skills tie, prefer the one with:
   - a narrower trigger for the current task;
   - fresher local evidence;
   - lower line count or lower context cost;
   - stronger verification instructions;
   - a project-specific source over a generic global source.

After authority, exact task fit, and evidence gates, use source provenance as a bounded tie-breaker: prefer an active, maintained, higher-star GitHub upstream Skill over an otherwise equal internally authored Skill. Bucket star counts and record `observed_at`; popularity is a prior, not proof of quality. Internal control-plane and project-local Skills keep authority where they encode proprietary state, permissions, checkpoints, or completion gates.

When the user explicitly rates a result `not_useful` and says to `avoid_default`, apply the negative score on the next routing decision and open same-domain replacement research immediately. Prefer a maintained higher-star GitHub candidate, but do not change the registry automatically. A replacement must pass same-input regression, independent review, post-coding review, governance promotion, and verified bundle/distribution receipt.

## Default Champions

Use these as the default high-quality route unless a narrower project skill wins:

- Continuity: `codex-agent-mem`
- Workflow separation: `agent-team-workflow`
- Skill maintenance: `skill-governance`, `skill-creator`
- Web research: `jina-search`
- OpenAI product/API guidance: `openai-docs`
- Browser/local UI verification: Browser plugin, `playwright`
- Frontend production quality: `frontend-design`, `impeccable`
- AI video and Image2-for-video quality: `ai-video-fundamentals-skill`
- Final-script director analysis and realistic character/key-prop assets: `chaoge-assets-trial`
- Standalone Image2 direct generation: `image2-direct`, `gpt-image-2-style-library`; use `ai-image-video-channel-router` only when selecting an external channel

`ikun-image2` is recorded as `unavailable_legacy`; it is not a routable fallback and must not be silently mapped to another provider.

## Conflict Rules

- Treat external-state execution as a distinct phase. Selecting, scripting, packaging, diagnosing, browsing, or compliance-checking does not authorize upload, publication, listing creation, comment/reply sending, or any other external write. Add an `explicit_only` execution route only when the user explicitly asks for that action, and preserve any final confirmation gate owned by that Skill.
- Do not stack two skills from the same family unless one is a prerequisite or they cover different phases.
- Prefer an orchestrator skill over its child skills for full workflows; load child skills only when the current phase is clear.
- For any short-drama redraw request involving `转绘`, `短剧转绘`, `墨西哥本土化`, source timelines, localized timelines, redraw asset prompts, first-frame redraw, `redraw`, or `remake`, route through `mx-shortdrama-00-router` for source hygiene and accepted redraw-artifact selection. If the same request also mentions `故事板`, `分镜板`, `电影制作板`, `视觉规划表`, `storyboard`, or `story board`, the global storyboard rule wins: invoke `image2-storyboard-video` as the mandatory primary storyboard workflow, using the accepted redraw artifact from the router as source material when needed.
- Prefer exact file-format skills over generic productivity skills.
- Prefer official-source skills for vendor/API questions.
- Prefer verification skills late in the task, not during initial ideation.
- Treat very broad style-library skills as explicit-only unless the user asks for exploration.
- For a finalized script that requests the full preproduction chain through realistic character and key-prop masters, route to `chaoge-assets-trial`; when the request reaches scenes, storyboards, video prompts, generation, or diagnosis, return to `ai-video-fundamentals-skill` instead of extending the trial Skill.
- For Image2 assets, first frames, character/product consistency, Seedance2 prompts, reroll strategy, or video diagnosis, route through `ai-video-fundamentals-skill` before channel-specific Image2 or Seedance2 execution skills.

## Maintenance Labels

The generated registry separates four facts that must not be conflated:

- `discovery_status`: whether an implementation is currently discoverable. This is inventory state, not a routing recommendation.
- `routing_status`: the governed routing level. Only a non-`unassessed` value may be cited as a default, primary, supporting, mandatory, or archival route.
- `classification_status`: whether a family has been deliberately assigned. `unclassified` is an audit backlog marker, not a reason to disable or delete a Skill.
- `evidence_status`: whether the local score log contains at least one real-use observation. It is not a quality score by itself.

For an `unassessed` route, keep the Skill available for explicit or unmistakably narrow user requests, but do not silently elevate it above a classified route. Record real use before assigning a stronger routing status. Do not infer poor quality from `unassessed`, `unclassified`, or `no_real_use`.

Use these labels during audits:

- `mandatory`: required by an explicit system, user, project, plugin, or task-type rule.
- `user_designated`: preferred by an explicit durable user decision.
- `evidence_backed_champion`: meets the local promotion threshold with real-use records.
- `provisional_default`: current default pending enough evidence for champion promotion.
- `primary`: default active specialist for a family.
- `supporting`: useful with a distinct phase or artifact.
- `candidate`: keep installed, score after use.
- `unassessed`: discoverable but not yet deliberately evaluated for automatic routing. Keep available for explicit or unmistakably narrow use.
- `explicit-only`: use only when named or strongly implied.
- `merge`: overlaps another skill; consolidate before deleting.
- `archive`: not default-routed; keep available outside the champion set.
- `delete-candidate`: remove only after replacement is confirmed and no recent project depends on it.

Never delete a skill based only on one audit pass. First demote to `explicit-only` or `archive`, then observe whether real work misses it.

## Monthly Router Review

1. Run `scripts/inventory_skills.ps1 -Format json -View registry -RegistryPath references/skill-registry.json` to refresh the enabled-plugin-aware registry.
2. Inspect duplicate names and broad descriptions first.
3. Compare recent scores in `skill-use-log.md` or memory.
4. Patch broad triggers before deleting skills.
5. Keep the active champion and primary set near 20-30 skills.
