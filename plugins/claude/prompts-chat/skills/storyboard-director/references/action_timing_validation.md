# Action Timing Validation

## Purpose

Use this file before finalizing a shot or long take.

The goal is not just to ask whether the shot is fast or slow. The goal is to check whether the audience can actually read the action chain in the available time.

This is especially important for:

- creature or character performance
- ad beats that must read quickly
- long takes carrying multiple actions
- magical actions with setup and visible consequence
- reaction shots that only work if the cause has already landed

## Core rule

Do not approve a shot only because its total duration looks plausible.

Approve it only if the key action units are readable in order.

For most character beats, test the shot against these units:

1. `setup`
   The audience understands who is about to act and what they are acting on.

2. `execution`
   The action itself happens.

3. `result`
   The audience sees what changed or failed to change.

4. `reaction`
   A character or the frame itself acknowledges the result.

Not every shot needs all four. But if a beat depends on them, do not compress them away.

## Why this matters

Action that is technically present can still be unreadable if:

- the shot starts too late
- the action launches with no anticipation
- the result is not held long enough
- the reaction is stacked on top of the result
- too many subjects initiate actions in one short beat

The audience then feels the shot is "jumping" even if the timing math appears short enough.

## Professional timing principles

Use these craft principles:

- action needs preparation when the audience must notice intention, not just movement
- result needs hold time when the story depends on success or failure being legible
- reaction needs its own breathing room when emotion is part of the story beat
- even timing often kills clarity and weight; staggered timing is usually easier to read
- body action should usually be initiated by a leading part, not every part moving at once

These are aligned with:

- ASC blocking-first camera logic and motivated movement thinking
- Disney / Eric Larson animation notes on action being initiated by a leading body part and on fully envisioning the phrasing of the action
- Animation Mentor timing guidance on anticipation, twinned timing, timing vs spacing, and planning timing before final posing

## Action readability checklist

Before finalizing a shot, answer:

- Can the audience identify the target of the action before the action happens?
- Does the acting subject get a readable preparation or intention cue?
- Is the execution itself visually clear?
- Is the result visible long enough to be understood?
- Does the reaction have enough room to land?
- Are two major action chains being forced into one short shot?
- Is the camera move making the action harder to read?

If any answer is no, revise the shot.

## Suggested timing heuristics

These are not hard physics values. They are readability heuristics for prompt planning.

### Simple single action

Example: touch, glance, turn head, reach, small gesture.

Typical readable range:

- `1.0-2.0s`

If the result matters, add another:

- `0.5-1.0s` for visible result hold

### Attempt and failure beat

Example: character tries something, nothing changes, then reacts.

Typical readable range:

- `0.8-1.5s` setup
- `0.8-1.5s` execution
- `0.6-1.2s` result hold
- `0.8-1.5s` reaction

Total common range:

- `3.0-5.0s`

### Handoff beat

Example: character A fails, looks to character B, character B prepares to try.

Typical readable range:

- `1.5-3.0s`

### Magical or stylized action

Example: sprinkle, cast, blow particles, aura spread.

Typical readable range:

- `0.8-1.5s` setup
- `0.8-1.5s` trigger
- `0.8-1.8s` spread or propagation
- `0.8-1.5s` result read

Total common range:

- `3.2-6.3s`

### Reaction-only beat

Example: surprise, disappointment, relief.

Typical readable range:

- `1.0-2.5s`

## Long-take rule

Long takes are allowed, but do not hide timing problems inside them.

A long take still needs internal action budgeting.

For each long take, identify:

- major action chain A
- major action chain B
- transition or handoff between them
- whether the camera move helps or hurts readability

If a long take contains more than two major action chains, default to skepticism.

## Common failure modes

### Missing setup

Symptoms:

- a character is suddenly already in the action
- intention is unclear
- body state jumps between shots

Correction:

- add a preparation beat or expand the entry into the action

### Result collapse

Symptoms:

- the action happens but the consequence is not visible
- success and failure read the same

Correction:

- hold longer on the changed or unchanged target

### Reaction collision

Symptoms:

- result and reaction happen on the same instant
- audience cannot tell what caused the reaction

Correction:

- separate result hold from reaction by a brief readable beat

### Twinned action

Symptoms:

- multiple body parts or characters move at once without hierarchy
- the beat feels robotic or messy

Correction:

- stagger the action so one subject leads and the other follows

### Camera override

Symptoms:

- movement is present but makes the causal chain harder to read
- the shot is technically dynamic but less legible

Correction:

- simplify the move or let the camera wait for the action

## Required validation fields

Each shot should record an `action_timing_validation` block with:

- `primary_action_chain`
- `secondary_action_chain`
- `setup_seconds`
- `execution_seconds`
- `result_seconds`
- `reaction_seconds`
- `available_seconds`
- `estimated_required_seconds`
- `timing_pressure`
- `readability_verdict`
- `adjustment`

## Release rule

Do not finalize a shot if:

- `estimated_required_seconds` is clearly above `available_seconds`
- the shot contains an attempt/failure beat with no visible result hold
- the shot contains a reaction with no readable cause
- the shot contains a secondary performer action with no setup or handoff

When in doubt, reduce the number of meaningful actions in the shot rather than speeding everything up.
