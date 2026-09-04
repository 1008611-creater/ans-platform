# Prompt Skill Router TODO

## v0.2.1 Follow-Up

- Add 3-5 local Image2 prompt examples scored with `benchmark-gates.md` object/composition checks.
- Add 2-3 storyboard-to-video or first-frame-to-video examples scored with the video gates.
- Add a small prompt-candidate version record format: source hash, candidate id, provider/channel, seed/settings if available, QA result.
- Decide whether `quick_validate.py` should become part of a broader skill CI script across all local skills.
- Revisit community prompt bases only as `C` grade sources; extract structure, never prose.

## Deferred

- Add provider-specific current behavior notes only after reading official docs for that provider/channel on the day of use.
- Add local failure cases from production only when the owning run/controller explicitly allows writing back to this skill.
