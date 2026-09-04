# Screenplay Parsing

Normalize screenplay inputs before planning shots.

## Preferred sources

- Final Draft `.fdx`
- Fountain
- plain text scene scripts
- treatments or outlines

## What to extract

- scene heading
- location
- interior or exterior
- time of day
- action blocks
- dialogue blocks
- characters in scene
- props and set anchors
- transitions or explicit camera directions if present

## Parsing principle

Treat explicit camera directions in the script as constraints, not automatic commands. The director layer should still judge whether they fit the final plan.

## Suggested open-source helpers

- `screenplay-parser`
- `screen-json`
- `Fountain.js`

Use them to normalize structure, then move into the story bible and shot-planning stages.
