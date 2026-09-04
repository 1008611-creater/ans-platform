# Source Timeline Schema

## Timeline Columns

| Column | Required content |
| --- | --- |
| 时间码 | Exact source time range, preferably `MM:SS.xx-MM:SS.xx` |
| 剧情段 | Short beat name with story function |
| 原片画面/构图 | Visible composition, camera, light, space, wardrobe, prop state |
| 角色站位/动线 | Character blocking: left/right, foreground/background, seated/standing, facing direction, distance, entry/exit path, occlusion, screen axis |
| 原对白还原 | Chinese dialogue from verified subtitle/ASR/manual review, resolved to concrete speaker and wording for delivered output |
| 剧情功能与复刻重点 | Theme, emotion, scene logic, lighting, camera logic, continuity details |

Do not add a delivered-output `抽帧证据` column by default. Use sorted timecodes and native frame filenames internally for verification, but keep the public timeline table focused on production-readable content unless the user explicitly asks for evidence citations.

## Continuity Checklist

- Character clothing, hair, makeup
- Hand position and body direction
- Phone screen state and call state
- Prop state and location
- On-screen text and subtitles
- Light direction, color temperature, contrast ratio
- Screen direction and camera axis
- Role positioning, entrance/exit path, foreground/background relationship, and character-to-prop distance

## Dialogue Handling

Hard subtitles outrank ASR when they disagree. Qwen3-ASR + ForcedAligner is supporting timestamped evidence only. If no subtitle is visible and ASR is unclear, keep the line in an internal candidate/blocker sidecar and do not put unresolved text into the delivered timeline.

Restore hard-subtitle dialogue line by line. Do not merge consecutive visible subtitle cards into a single summarized sentence in either the timeline table or `## 原片对白顺序`. If OCR/dedup misses a subtitle but video/manual frame review shows it, use the manual hard-subtitle reading and keep the line separate.

In `## 原片对白顺序`, every line must identify the speaker:

```text
MM:SS.xx 角色：对白
```

Do not deliver `未知/待确认`, `ASR/待确认`, `speaker_unknown`, or equivalent placeholder speaker labels. Resolve offscreen speech from voice, mouth movement, adjacent reaction shots, relationship logic, subtitle timing, and canonical name glossary; if it still cannot be resolved, block the handoff and repair the evidence ledger first.
