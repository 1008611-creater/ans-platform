# Critique Correct Verify

## Purpose

Use this file after a first-pass shot plan exists.

The skill must not treat the first camera idea as correct by default.
Run a critique pass, apply the smallest effective correction, then verify the revised shot.

## Core rule

Do not praise a shot before stress-testing it.

The output should reveal why a first-pass shot might fail, then explain the fix.

## Shot-level critique fields

Record:

- `primary_risk`
- `why_it_can_fail`
- `correction`
- `verified_choice`

## Critique questions

Ask these in order:

1. Is the protagonist clearly prioritized?
2. Is the dramatic beat readable without extra explanation?
3. Is the movement motivated?
4. Is the shot size the simplest strong choice?
5. Is the composition goal legible?
6. Does the focus shift happen clearly?
7. Does the tempo serve the emotion?
8. Is the action chain readable in the available time?
9. Is the prompt asking the generator to do too many things at once?

## Common failure modes

### Decorative movement

Symptoms:

- camera moves but nothing meaningful shifts
- the same beat would read better with a static or gentler shot

Correction:

- simplify to static, restrained follow, or a shorter move tied to the turning point

### Wrong subject hierarchy

Symptoms:

- support character steals center or contrast
- helper action feels more important than protagonist action

Correction:

- restage the helper to edge or secondary plane
- keep the camera aligned to the protagonist beat

### Repeated framing

Symptoms:

- adjacent shots feel visually redundant
- new information is too small to justify a new shot

Correction:

- merge beats
- change size, angle, or blocking function only if meaning changes

### Timing overload

Symptoms:

- a character is suddenly already acting with no visible preparation
- result and reaction collapse into the same instant
- one short shot tries to carry multiple meaningful action chains

Correction:

- add a setup beat
- hold longer on the result
- separate the handoff between performers
- simplify or shorten the camera move

### Overwritten prompt

Symptoms:

- too many simultaneous actions
- too many style tags or effects
- likely identity drift during generation

Correction:

- reduce shot tasks
- split into cleaner beats
- move some continuity information into anchors

### Emotional mismatch

Symptoms:

- fast move on a tender beat
- distant framing on a critical reaction
- flashy movement on a restrained brand moment

Correction:

- adjust tempo, hold, or shot size before adding complexity

## Verify pass

After correction, confirm:

- the protagonist still owns the beat
- the shot reads from the script alone, not from explanation
- the generator can reasonably execute the prompt
- the shot sequence now has better diversity or stronger clarity

## Source orientation

This workflow is aligned with:

- FilmAgent critique-correct-verify collaboration
- Mind-of-Director human review expectations
- practical storyboard revision logic from Storyboarder
