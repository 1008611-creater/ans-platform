# Acceptance Criteria

## Narrative

- Preserve the source episode's main conflict, relationship logic, emotional turn, and ending hook.
- Do not invent new motivations to cover missing analysis. Mark uncertain lines if needed.
- Do not add empty shots or filler dialogue to reach duration.
- If the user provides per-episode duration tolerance, compute the exact target range.

## Localization

- Replace Chinese people/place/institution names with target-market names.
- Replace Chinese visual text in signs, UI, subtitles, documents, name cards, and overlays.
- Reframe relationship terms that do not translate safely. Romance involving "哥哥/大哥" should usually be expressed via names or foster/adoptive relationships.
- Keep target-market dialogue natural. Avoid overly literal translations if they sound unnatural or cause confusion.

## Continuity

- Track clothing, hair, makeup, prop state, hand position, character standing/sitting direction, and light direction.
- Avoid same-angle jump cuts and unclear screen direction in dialogue scenes.
- Maintain consistent character face design and voice timbre across scenes.

## Visual And Sound

- Use the source aspect ratio unless the user instructs otherwise.
- For vertical short drama, default to 1080x1920 and source fps unless specs say otherwise.
- Keep subtitles in a safe area, high contrast, and 1-3 lines.
- Human voice must be clear over BGM. Keep target-language lines short enough for lip sync.
- Core actions need SFX: calls, notification/failed call, footsteps, doors, impact, object handling.

## Shot Prompt Deliverability

- Treat the timecoded timeline as human QA reference, not as the final redraw deliverable.
- Combine extracted frames, corresponding audio/ASR, and the localized redraw script before writing production prompts.
- Every generated video shot needs a first-frame image prompt. Add key-frame prompts for action turns, prop reveals, expression changes, readable screen changes, or camera target changes. Add last-frame prompts when continuity or tail-frame chaining matters.
- Every generated shot needs one all-purpose reference image-to-video prompt whose copyable body uses only `【基础设定】`, `【画面锚点与连接】`, and `【声音】`.
- Put upload order, reference-image duties, and limitations in the shot table or notes outside the copyable video prompt body.

## Delivery

- Include a character localization table and asset notes even when only delivering a script.
- Include shot-level frame and video prompts when the user asks for production-ready redraw, AI remake, first frames, key frames, last frames, or video prompts.
- Include a technical note describing whether ASR, OCR/hard subtitles, scene detection, or manual frame review was used.
- Flag all unresolved uncertainties instead of hiding them.

## Common Failure Modes

- Only translating dialogue while leaving Chinese signs and phone UI.
- Treating "大哥/哥哥" as literal blood brother in a romantic plot.
- Losing the source episode's hook by over-explaining the male lead.
- Making target-language lines too long for the original pacing.
- Delivering only a polished timeline script while omitting usable first-frame/key-frame/last-frame prompts and video prompts.
- Writing video prompts from localized text alone without checking the corresponding extracted frames and audio.
- Mixing modern urban wardrobe with historical/court wardrobe without story reason.
- Removing the humiliation/turning-point beat and making the heroine leave without clear motivation.
