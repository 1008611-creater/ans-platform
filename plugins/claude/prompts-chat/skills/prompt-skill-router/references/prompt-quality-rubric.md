# Prompt Quality Rubric

Use this rubric before calling a prompt "best", "high quality", reusable, or production-ready.

Score each dimension from 0 to 2. A prompt cannot be called reusable, production-ready, or "best" until it passes this rubric and the relevant domain QA gate.

## Dimensions

1. Route fit
   - 0: wrong domain skill or generic prompt.
   - 1: partially correct route but missing method, execution, or gate.
   - 2: correct method, execution, and quality gate.

2. Source fit
   - 0: no source or weak source used for authority.
   - 1: relevant source but not translated into task-specific constraints.
   - 2: best-fit local/external source converted into a local contract.

3. Specificity
   - 0: abstract adjectives and vague intent.
   - 1: some concrete details but key variables remain implicit.
   - 2: subject, context, composition, constraints, and output format are explicit.

4. Concrete visual variables
   - 0: relies on words like "premium", "cinematic", "beautiful", "viral", "realistic", or celebrity comparisons.
   - 1: includes some visible traits but leaves face/body/material/camera/light/layout underspecified.
   - 2: turns intent into visible features: anatomy/shape, materials, clothing, props, camera, lens, light, layout, action, and environment.

5. Positive-first structure
   - 0: prompt is dominated by "do not" clauses or mixed warnings.
   - 1: positive and negative instructions are both present but tangled.
   - 2: positive description is complete first, with a short final negative block.

6. Failure control
   - 0: no negative constraints or known failure handling.
   - 1: generic negative prompt or too many scattered restrictions.
   - 2: 5-10 targeted constraints based on model, platform, and prior failure mode.

7. Execution realism
   - 0: asks the model to do things it is weak at, such as long precise text in image.
   - 1: technically possible but fragile.
   - 2: uses the right split between generation, local overlay, post-processing, research, and review.

8. Platform/domain nativeness
   - 0: output feels generic or off-platform.
   - 1: roughly fits the platform/domain.
   - 2: language, structure, proof, and visual format match the target platform/domain.

9. Evaluation path
   - 0: no way to tell if the output worked.
   - 1: subjective visual/readability check only.
   - 2: clear pass/fail checklist or scoring loop.

10. Approval and production boundary
   - 0: encourages provider execution, ledger changes, QA pass, delivery, or paid calls without approval/evidence.
   - 1: mentions approval or QA but leaves state boundaries unclear.
   - 2: separates prompt candidate, provider execution, QA, ledger status, and delivery state.

## Thresholds

- 17-20: production-ready.
- 13-16: usable draft, revise before publishing or generation.
- 9-12: direction only, not a final prompt.
- 0-8: reject and reroute.

## Automatic Rejects

Reject immediately when:
- the prompt asks an image model for long accurate Chinese text, fake documents, fake chat screenshots, fake bank records, or fake legal proof;
- the route skips a required platform or domain skill;
- the prompt relies on one broad style word such as "realistic", "premium", "cinematic", or "viral" without visible evidence;
- the prompt relies on a celebrity comparison without translating it into visible traits;
- the prompt is mostly negative constraints, or negative constraints are scattered through every block;
- the prompt uses "not Chinese / no East Asian / local" style restrictions without giving the positive target ethnicity/local visual range when ethnicity matters;
- the prompt has conflicting styles or impossible output requirements;
- the prompt asks for exact generated UI/document text when local overlay would be the reliable path;
- the prompt quality gate is "looks good" with no concrete criteria;
- paid generation is executed before the prompt candidate and approval boundary are clear.

## Repair Order

Fix in this order:
1. route,
2. source pattern,
3. output contract,
4. positive visible details,
5. composition/camera/light/materials,
6. text strategy,
7. focused negative constraints,
8. generation/post-processing split,
9. approval and ledger boundary,
10. quality gate.
