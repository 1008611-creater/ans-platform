---
name: short-drama-remake-script
description: name: short-drama-remake-script
---

---
name: short-drama-remake-script
description: Convert Chinese short-drama episode videos into localized bilingual remake/redraw production packages for AI video production. Use when the user provides a short-drama MP4 or episode folder and asks for 拉片, 视频转剧本, 转绘剧本, 外语版短剧, 本土化改编, AI转绘重制, 配音字幕脚本, shot-level first-frame/key-frame/last-frame prompts, all-purpose reference video prompts, or production-ready episode packages that preserve the original narrative while replacing Chinese visual/cultural elements.
---

# Short Drama Remake Script

## Purpose

Turn a source short-drama episode into a production-ready remake package for AI redraw/remake work. Preserve the original episode's narrative logic, conflict, timing, and hook while localizing people, places, dialogue, props, on-screen text, UI, subtitles, and delivery constraints for the target language/market.

The timeline script is a reference artifact for human QA and continuity checking. The true production output is usable redrawn shot prompts: per-shot first-frame, key-frame, and last-frame image prompts plus matching all-purpose reference image-to-video prompts grounded in extracted frames, corresponding audio, and the localized redraw script.

## Default Workflow

1. **Ground in the video**
   - Confirm source path, exact duration, resolution, fps, and aspect ratio.
   - Extract representative frames and subtitle-area crops before writing.
   - If tools are missing, install the needed local packages rather than guessing.

2. **Create evidence files**
   - Prefer `scripts/analyze_episode.py` for repeatable analysis.
   - Save outputs under a task-specific work folder such as `output/EP001_work/`.
   - Keep transcript, scene cuts, frame sheets, and metadata so the script can be audited.

3. **Build the reference timeline**
   - Segment at shot level when the output will be used for redraw prompts. Story beats may group rows, but they must not replace camera cuts, reaction shots, prop inserts, screen inserts, blocking changes, or transitions.
   - For each row capture: timecode, visual action, shot function, Chinese line, target-language line, audio/performance cue, localization notes, and continuity risks.
   - Use hard subtitles and ASR together. When ASR is degraded by BGM or overlap, trust visible subtitles and picture evidence.

4. **Localize for remake**
   - Replace Chinese setting details with target-market equivalents, not just translated text.
   - Localize names, institutions, UI, documents, street/signage, and relationship terms.
   - Avoid literal translations that create cultural or ethical confusion. For example, Chinese "大哥/哥哥们" in romance plots often needs "foster/adoptive brother" framing or direct given names.

5. **Build shot-level redraw prompts**
   - Combine extracted frames, shot/timecode evidence, corresponding audio/ASR, and the localized script.
   - For each required shot or approved merged shot, write first-frame, key-frame when needed, and last-frame image prompts.
   - For each generated shot, write one all-purpose reference image-to-video prompt using only `【基础设定】`, `【画面锚点与连接】`, and `【声音】` in the copyable body.
   - Put reference-image responsibilities and upload order in the shot table, not inside the copyable video prompt.

6. **Write the deliverable**
   - Output a compact production package in the user's requested language mix.
   - Include episode info, character localization table, reference timeline, target-language production script, shot prompt package, supporting asset needs, continuity/punch-through risks, and acceptance checklist.
   - Keep target runtime within the user's tolerance window. If the user gives "original duration ±10 seconds", compute and state the exact range.

## Tooling

Use the reusable analyzer when possible:

```powershell
python C:\Users\lsb\.codex\skills\short-drama-remake-script\scripts\analyze_episode.py `
  "D:\path\EP001.mp4" `
  --out-dir "D:\path\output\EP001_work" `
  --language zh `
  --whisper-model small
```

The analyzer tries to:

- extract metadata with OpenCV;
- extract 16k mono WAV using `imageio-ffmpeg`;
- create full-frame and subtitle-area contact sheets;
- run PySceneDetect scene detection when installed;
- run `faster_whisper` transcription when installed.

If dependencies are absent, install only what is needed:

```powershell
python -m pip install imageio-ffmpeg scenedetect faster-whisper
```

Do not block on perfect ASR. Short-drama audio often has BGM, sound effects, and overlapping lines. Use ASR as evidence, then correct with visible subtitles and frame context.

## Output Shape

For full output format, read `references/output-template.md`. For acceptance constraints and common failure modes, read `references/acceptance-criteria.md`.

Minimum deliverable:

- episode information and exact runtime target;
- localized character table;
- timecoded pull-analysis table as a QA reference;
- target-language production script by scene;
- shot-level redraw prompt package for first-frame, key-frame, last-frame images and all-purpose reference image-to-video prompts;
- supporting asset and redraw requirements;
- continuity/localization risk checklist;
- note of analysis method and unresolved uncertainties.

## Localization Rules

- Convert public institutions into target-market equivalents such as `Registro Civil` for a Latin American marriage registration office.
- Replace all Chinese on-screen text: wall signs, queue prompts, subtitles, name cards, phone UI, documents, certificates, chat screenshots, account IDs, watermarks, and location text.
- Keep clothing style coherent. Do not mix palace/classical styling with modern urban styling unless the source story explicitly does.
- Preserve prop state across cuts: flowers, phones, documents, cups, injuries, clothing, hair, and hand position.
- Keep scene light direction and color temperature coherent inside each scene.
- For voice and subtitles, keep target-language lines short enough for lip sync and short-drama pacing.

## Quality Bar

The final package should let a production team start frame-image generation, voice/subtitle planning, and image-to-video generation without re-deciding the episode logic. If the output only contains a polished timeline script but not usable shot prompts, it is incomplete for redraw production.
