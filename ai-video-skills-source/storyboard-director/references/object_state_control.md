# Object State Control

## Purpose

Use this file when a story beat depends on an object being in the correct visible state.

Typical examples:

- unripe fruit vs ripe fruit
- closed cotton boll vs full bloom cotton
- empty cup vs full cup
- sealed box vs opened box
- unlit lamp vs lit lamp

## Core rule

If the object state matters to the story, record it explicitly.

Do not rely on vague phrases like:

- no change
- still the same
- not yet transformed

Translate those into visible markers.

## Record these fields

- `object`
- `required_state`
- `visible_markers`
- `forbidden_markers`
- `transition_gate`

## Example

Object:

- cotton boll

Required state:

- closed green boll

Visible markers:

- green husk
- shell still closed
- small and tight
- no visible white fiber

Forbidden markers:

- large fluffy cotton mass
- split-open cotton
- fully bloomed white cotton

Transition gate:

- only allowed to bloom after magical success beat

## State conflict check

Flag a shot if it contains both:

- early-state wording
- late-state visual wording

Example conflict:

- unripe green cotton boll
- fluffy white cotton exposed

That is usually a prompt contradiction and should be corrected.
