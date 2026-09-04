---
name: storyboard-director
description: Build or run a storyboard-director workflow that reads a script, reviews the beat structure, plans professional storyboard shots, validates action timing, expression, and object state, critiques and scores the plan, and outputs detailed storyboard prompts or screenplay-style shot lists. Use when the user wants script-to-storyboard prompts, shot-by-shot visual planning, storyboard review, or a professional breakdown before video generation.
---

# Storyboard Director

Turn a script, treatment, outline, scene, or brand short into a professional storyboard plan and detailed shot prompts.

Use this skill when the user wants:

- `剧本 -> 分镜脚本`
- `剧本 -> 详细分镜提示词`
- storyboard review before video generation
- shot-level prompt structure for Jimeng, Seedance, image boards, or human storyboard artists
- rhythm, expression, blocking, or visual readability checks before final prompt writing

This skill is storyboard-first, not model-first.

Do these in order:

1. understand the script
2. review the beat and rhythm
3. decide how the scene should be expressed visually
4. build storyboard shots
5. validate action timing, expression, and object state
6. critique and score the result
7. output storyboard-ready prompts

## Source Policy

Prefer official and professional-team sources over generic prompt folklore.

Use this order:

1. professional team and research-team open-source projects for shot planning and storyboard logic
2. official product material when the user also needs model-specific prompt constraints
3. practical storyboard workflow tools for review expectations
4. your own fallback reasoning only when the sources above do not answer the question

See [open_source_foundations.md](./references/open_source_foundations.md) and [source_map.md](./references/source_map.md).

## What This Skill Is Based On

This skill is intentionally built from these open-source directions:

- `ViMax` for script-to-shot orchestration and shot-level storyboard planning
- `FilmAgent` for director/screenwriter/cinematographer role decomposition and critique-correct-verify
- `MovieAgent` for hierarchical multi-scene and multi-shot planning
- `Story2Board` for panel-level prompt shaping
- `TaleCrafter` for story-to-layout and multi-character consistency
- `Storyboarder` for practical human storyboard workflow expectations
- `screenplay-parser` and screenplay interchange tools for script normalization

Do not claim this skill is an official release from those teams.
It is a new skill built by combining their strongest reusable ideas into one workflow.

## Workflow

### 1. Parse the script before you invent shots

Extract:

- scenes or user-provided segments
- who is present
- what changes
- what the audience must understand
- emotional turns
- objects whose state matters
- location, time, weather, and period clues

Use [screenplay_parsing.md](./references/screenplay_parsing.md).
Use `scripts/normalize_script.py` for a deterministic first pass.

### 2. Review the script as a visual problem

Before writing any shots, ask:

- what is this scene trying to express
- what must the audience understand without explanation
- which beats will read fast
- which beats need more hold time
- which beats want long takes
- which beats should cut
- which objects or transformations need state control
- which performances depend on expression rather than action

Use [script_review.md](./references/script_review.md).

Do not force the original written second marks if they conflict with readable action.
The script timing is a reference. Readability is the release gate.

### 3. Build a story bible

Before final storyboard writing, build a compact internal representation:

- premise
- theme cues
- protagonist hierarchy
- character identity anchors
- location anchors
- continuity risks
- object-state risks
- style and audience

Use `scripts/build_story_bible.py`.
See [assets/example_story_bible.json](./assets/example_story_bible.json).

### 4. Resolve style and presentation mode

Choose one:

- `script_inferred_style`
- `user_locked_style`
- `hybrid_style`

Record both:

- `style_mode`
- `style_rationale`

See [style_inference.md](./references/style_inference.md).

### 5. Plan the storyboard by scene objective, not by camera decoration

For each scene or beat, decide:

- scene objective
- protagonist priority
- how the scene should be expressed
- whether it wants restraint, intimacy, tension, wonder, comedy, clarity, or release

Then decide shots from that.

Use:

- [storyboard_workflow.md](./references/storyboard_workflow.md)
- [director_decision_framework.md](./references/director_decision_framework.md)

### 6. Design each shot with six required layers

Every storyboard shot must explicitly resolve:

1. `narrative_purpose`
2. `audience_focus`
3. `blocking_plan`
4. `composition_goal`
5. `expression_plan`
6. `movement_motivation`

Also resolve:

- `tempo`
- `focus_shift`
- `transition_reason`

If any of these are vague, the shot is not ready.

See:

- [expression_design.md](./references/expression_design.md)
- [lighting_design.md](./references/lighting_design.md)
- [sound_design.md](./references/sound_design.md)

### 7. Run action timing validation

Do not approve a shot because the total seconds look plausible.

Validate whether the available duration can clearly carry:

- setup
- execution
- result
- reaction

This applies to long takes too.

If one character fails and another character then prepares to try, those are separate readable units.
Do not collapse the second performer into a sudden already-moving state.

See [action_timing_validation.md](./references/action_timing_validation.md).

### 8. Run expression validation

Do not rely only on body motion.

Check whether the audience can read:

- what the character feels before the action
- how that feeling changes during the action
- whether the result changes the expression
- whether the reaction lands clearly

If the scene depends on emotion but the face, posture, wing/hand gesture, or eye direction are unspecified, revise it.

See [expression_design.md](./references/expression_design.md).

### 9. Run object-state control

If an object has story-critical state, record it explicitly.

Examples:

- unripe cotton boll vs full bloom
- closed box vs opened box
- intact sword vs shattered sword
- empty cup vs filled cup

For each critical object, record:

- required state now
- visible markers
- forbidden markers
- when state transition is allowed

See [object_state_control.md](./references/object_state_control.md).

### 10. Critique, correct, and verify

Do not trust the first pass.

For each shot:

- identify the likely failure mode
- make the smallest useful correction
- verify that the revised shot improves clarity, protagonist priority, and controllability

See [critique_correct_verify.md](./references/critique_correct_verify.md).

### 11. Score before final output

Use at least:

- narrative fidelity
- protagonist priority
- blocking clarity
- composition logic
- camera motivation
- rhythm control
- action timing readability
- expression readability
- object state control
- generation controllability

See [evaluation_rubric.md](./references/evaluation_rubric.md).
Use `scripts/score_storyboard_plan.py`.

### 12. Render the storyboard output

Default Chinese final output should be a screenplay-style storyboard script:

```text
全局风格：
...

【00-12s｜第一幕：标题】
镜头1：0-4s [中景] ...
镜头2：4-7s [近景] ...
镜头3：7-12s [特写] ...
音效：...
```

Use sparse front labels.
Keep movement in the shot sentence body.
Keep sound at the end of the scene block.
Do not expose internal review layers unless the user explicitly asks for analysis.

Use:

- [storyboard_prompt_format.md](./references/storyboard_prompt_format.md)
- `scripts/render_storyboard_prompt.py`

## Output Modes

Use these output modes:

- `storyboard_script`
  Default final Chinese output. Scene header, shot lines, scene-level sound.

- `prompt_only`
  Compact prompt blocks with no internal review lines.

- `review`
  Analysis mode. May include director decision, action timing validation, critique, and scoring.

## Output Contract

Use the schema in [storyboard_schema.json](./assets/storyboard_schema.json).

Each shot should capture:

- `narrative_purpose`
- `audience_focus`
- `director_decision`
- `expression_plan`
- `action_timing_validation`
- `object_state_control`
- `subject`
- `action`
- `setting`
- `mood`
- `shot_size`
- `angle`
- `lens`
- `composition`
- `lighting`
- `sound_design`
- `critique_pass`
- `evaluation`
- `timecoded_beats`

## Prompt Rules

- Do not dump the whole screenplay into one giant prompt.
- Do not design shots before understanding the script objective.
- Do not let support characters steal the protagonist beat unless the story truly shifts focus.
- Do not overload front labels with too much technical data.
- Do not approve a shot whose action chain is unreadable in the available seconds.
- Do not approve an emotional shot whose expression chain is vague.
- Do not approve an object-transformation shot without explicit object-state control.
- Do not expose internal review layers in final output unless the user explicitly asks for review mode.
- When a user shows a preferred storyboard prompt structure, mirror it closely.

## Resources

### scripts/

- `normalize_script.py`
- `build_story_bible.py`
- `validate_storyboard_plan.py`
- `score_storyboard_plan.py`
- `render_storyboard_prompt.py`

### references/

Read only the files you need:

- `open_source_foundations.md` for where the workflow came from
- `storyboard_workflow.md` for the main planning pipeline
- `script_review.md` for pre-shot review logic
- `storyboard_prompt_format.md` for final output structure
- `expression_design.md` for character expression planning
- `object_state_control.md` for state-gated objects
- `action_timing_validation.md` for readable action timing

### assets/

- `storyboard_schema.json`
- `example_storyboard_plan.json`
- `example_story_bible.json`
