# Style Inference and Style Locking

## Contents

- Style modes
- Style profile fields
- Global vs local
- Inference heuristics
- Prohibited shortcut
- Merge rule

This skill must treat style as a decision layer, not as a fixed preset.

## Style Modes

### `script_inferred_style`

Use when the user did not specify a visual package. Infer style from:

- genre
- period
- geography and culture
- realism level
- emotional temperature
- intended audience
- pacing
- thematic motifs
- platform or runtime goal

### `user_locked_style`

Use when the user explicitly provides:

- medium or look
- palette
- realism level
- texture
- movement philosophy
- commercial or platform target

In this mode, the camera grammar can still adapt to the scene, but the macro look should not drift.

### `hybrid_style`

Use when the user wants a stable look but not a rigid shot template.

Typical pattern:

- lock: medium, realism, palette, texture, era, key lighting bias
- infer: pacing, shot progression, lens behavior, movement intensity, framing emphasis

## Style Profile Fields

A style profile should capture:

- `medium`
- `realism_level`
- `palette`
- `contrast`
- `texture`
- `lighting_bias`
- `movement_energy`
- `composition_density`
- `rhythm`
- `audience`
- `prompt_tags`

## Global vs Local

Separate style into three layers:

### Global anchors

These remain stable across most scenes:

- medium
- realism level
- palette family
- texture
- overall contrast philosophy

### Scene modulation

These can shift by scene:

- key or low-key lighting
- movement intensity
- framing tightness
- color temperature
- composition density

### Shot decisions

These should change often:

- shot size
- angle
- lens feel
- foreground strategy
- exact movement

## Inference heuristics

Use the script to infer visible traits instead of labels alone.

Examples:

- social realism drama -> naturalistic light, restrained movement, practical environments, modest contrast
- romantic fantasy -> softer contrast, more atmospheric light, gentle motion, lyrical framing
- techno-thriller -> controlled geometry, cooler accents, higher contrast, precise movement
- comedy -> cleaner readability, rhythmically motivated movement, expressive reactions, less oppressive contrast
- historical epic -> wider staging, stronger spatial depth, costume and production detail emphasis
- ink or mythic Chinese fantasy -> negative space, stylized motion, selective palette, calligraphic texture

## Prohibited shortcut

Do not solve style by naming a famous living director and copying them.

Instead, translate the desire into visible properties:

- lens behavior
- framing density
- motion restraint or fluidity
- light quality
- color system
- texture
- temporal rhythm

## Merge rule

When style data comes from more than one source, merge in this order:

1. user lock
2. explicit script directions
3. inferred profile
4. neutral fallback

The shot plan must record which fields were inherited and which were inferred locally.
