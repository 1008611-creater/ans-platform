---
name: mx-shortdrama-02-source-timeline
description: name: mx-shortdrama-02-source-timeline
---

---
name: mx-shortdrama-02-source-timeline
description: "Step 02 for Chinese short-drama redraw to Mexico: rebuild the original episode source reference timeline from a validated Step 01 evidence package, including frame matching, PaddleOCR API smart selective OCR, ASR, TransNetV2/OpenCV shot evidence, and native-resolution visual review. Use for source timeline, episode pull analysis, original dialogue recovery, source plot reconstruction, continuity evidence after frame extraction, smart OCR QA, and QA reference before localized shot prompt production."
---

# MX Shortdrama 02 Source Timeline

## Purpose

Turn the source video and extracted frames into an evidence-grounded original episode reference timeline. This step reconstructs the Chinese source; it does not localize to Mexico or produce final shot prompts.

The timeline is a human-QA and evidence handoff artifact. Its downstream purpose is to help Step 03 localize accurately and help Step 04 combine extracted frames/audio with the localized script for usable redraw shot prompts.

Current user workflow rule: Step 01 is not a user-approval stop. Step 02 is the first review stop after extraction; produce the Step 02 Word/source-timeline artifact, then wait for user验收 before Step 03.

Current project rule for `偏心学弟后我悔不当初`: use audio-first dialogue reconstruction, but require smart-trigger OCR when evidence indicates missing or misaligned subtitles/text. Do not delay Step 02 waiting for full-episode OCR. When OCR is needed, Baidu OCR API is the default and preferred source; set `BAIDU_OCR_ACCESS_TOKEN` or `BAIDU_OCR_API_KEY + BAIDU_OCR_SECRET_KEY`. Local RapidOCR must not be used as the default fallback. Use Qwen3-ASR-1.7B plus Qwen3-ForcedAligner-0.6B timestamped transcript, semantic cleanup, audio ledgers, Baidu smart-OCR subtitle/text windows, and visual shot review together. WhisperX/faster-whisper may be used only as fallback or comparison evidence when Qwen3 is unavailable, timed out, or failed. SenseVoice/FunASR is legacy comparison evidence only; do not reintroduce it as the default ASR route. Names, amounts, brands, posts, phone screens, and exact text that are not resolved stay in internal candidate ledgers or a blocker list; the Step02 -> Step03 handoff must not pass placeholder speakers, placeholder wording, or raw uncertainty tags. OCR is not a global blocker, but it is mandatory QA for user-flagged gaps, short subtitles near cuts, text-screen shots, and ASR segments that are too long, repeated, or assigned to the wrong speaker.

ASR text is never text-only evidence. Every ASR/VAD dialogue candidate must keep its `start/end` time range. When ASR or semantic cleanup produces a one-character or semantically incomplete candidate such as `让`, `张`, `嗯`, `啊`, `的`, or `了`, use that exact ASR time window to extract dense subtitle frames at 0.1-0.2 second intervals, then manually/OCR-check the visible subtitle and mouth/context. If the window does not confirm a complete meaningful dialogue line, reject the candidate into an internal sidecar and do not put it in `原片对白顺序`, Step02 rows, Step03 localization, or Step04 timed action dialogue.

Project proper nouns are not free ASR text. Maintain a per-project canonical role/name glossary and normalize every speaker label, dialogue mention, asset candidate, and downstream handoff field against it before writing Step 02 Word/MD/JSON. For `偏心学弟后我悔不当初`, canonical names include `秦朗 / Bruno Medina`, `池雪 / Valeria Solis`, and `陆轻舟 / Luis Aranda`; ASR/OCR variants such as `秦郎`, `秦洛`, `秦老`, `情歌`, `持雪`, `吃雪`, `芷雪`, `陆青舟`, `陆青州`, `陆清舟`, `陆钦舟`, `陆秦周`, `青舟`, `青州`, `秦周`, and `秦舟` are candidate aliases only and must not appear in user-facing deliverables. When a user flags a name error or when ASR mentions a character name at a known timestamp, use that ASR time window to extract dense subtitle frames and run OCR/manual subtitle reading if the glossary alone does not settle it. Known character information and verified subtitle/OCR override ASR homophones.

## Clean Handoff Contract

Step 02 may collect messy evidence, but it must hand off clean structured data. The accepted downstream handoff is not the raw ASR/OCR ledger; it is shot rows with concrete `Shot`, `时间码`, `原片画面/构图`, `角色站位/动线`, and dialogue lines in `具体说话人：原片台词` form. If a spoken line's speaker, wording, or timing cannot be resolved enough to support Step 03/04, record a blocker and repair Step 01/02 evidence before routing forward.

Do not let raw evidence phrases enter delivered timeline cells or handoff JSON: `抽帧图`, `native frame`, `按原片`, `见原片`, `speaker_unknown`, `未知`, `待确认`, `现场说话人`, and equivalent placeholders are evidence-state labels, not production timeline content. Convert them into visible facts, concrete speaker attribution, or blockers.

Step 02 must compile from evidence into a clean source-timeline object before any Word/Markdown writing:

- `sourceRows`: one row per meaningful shot/camera state, each with nonempty visual composition and blocking/movement fields;
- `dialogueBindings`: line-level bindings with time range, concrete speaker, original text, source basis, and attribution status kept in sidecar when needed;
- `assetCandidates`: concrete characters, scenes, props, and text screens by visible function, not `身份待确认` placeholders;
- `blockers`: unresolved evidence that prevents clean handoff.

If any required field remains unresolved, write only the blocker sidecar/log and stop. Do not output a user-facing Step02 Word that contains a placeholder and hope Step03/Step04 will fix it.

Current-template smart OCR rule: after the no-OCR audio semantic dialogue ledger exists, run `scripts/smart_selective_ocr.py --engine baidu-api` for normal short-drama episodes whenever subtitle/text risk exists. This is targeted API OCR, not full-frame OCR: select dialogue-active cuts, short subtitle windows, user-flagged frames, phone/screen/document shots, low-confidence ASR spans, and rows with speaker/wording risk. If Baidu OCR credentials are unavailable, write a blocker and do not silently fall back to local OCR. If smart OCR runs after the first Word draft, rebuild the delivered MD/JSON/DOCX so the API OCR corrections are not left only as sidecar files.

EP007/Qwen3 calibration result: Qwen3-ASR plus Qwen3-ForcedAligner is the preferred ASR/timestamp route, but CPU-only Qwen3 can time out or stall. If that happens, Step 01 must write an ASR blocker and continue with VAD/audio-event ledgers, dense frames, OCR, and any available fallback transcript rather than inventing dialogue. Earlier legacy ASR drafts showed operationally important weak points: repeated long ASR lines can be copied into the wrong shots, very short hard subtitles can disappear between shot start/mid/end frames, and speaker attribution can drift when office/background voices are present. Therefore full OCR is still not a default blocker, but smart-trigger OCR and dialogue alignment are part of the accepted Step 02 QA path.

## Optimal Dialogue Evidence Path

The accepted production path is not "Qwen3 output equals final dialogue." Qwen3 is the timestamped trigger layer.

Run dialogue evidence in this order:

```text
Qwen3-ASR + ForcedAligner timestamp candidates
-> audio semantic dialogue ledger
-> smart OCR before timeline draft
-> Step02 draft timeline
-> smart OCR again with timeline windows
-> final Step02 rebuild
-> validation / blockers
```

Rules:

- Qwen3 transcript segments trigger exact time windows; they do not become final dialogue until reconciled.
- One-character, semantically incomplete, low-confidence, long, repeated, name-bearing, or speaker-risk segments must trigger dense subtitle frames and smart OCR/manual read.
- VAD/audio-event windows missing from Qwen3 must still be represented as confirmed dialogue, background/ambient office speech, offscreen voice, hearing unclear, or ASR hallucination.
- Baidu OCR API is preferred and default. If no Baidu credentials exist, write a blocker; do not silently run local OCR fallback.
- Step02 Word must be rebuilt after OCR reconciliation. Sidecar OCR results without a rebuilt user-facing timeline do not count as completion.

The preferred Step 02 structure is minute-based review plus shot-level rows: each 60-second chunk becomes `第N分钟内容`, and inside that chunk every meaningful shot/camera state keeps its own row. The minute grouping helps human review large episodes without flattening the actual shot structure.

Do not treat Step 02 completion as production completion. Do not generate first-frame, key-frame, last-frame, or video prompts in this step. Preserve enough source frame/audio/shot anchors for Step 04, including `minute_chunks/` references when Step 01 processed the episode in 60-second chunks.

For redraw work, the timeline's minimum unit is the actual shot/camera state, not the broader story beat. A `剧情段` may group several rows, but every meaningful cut, reaction shot, prop insert, text/screen insert, blocking change, and transition frame must be represented as its own row unless adjacent shots are visually identical and serve the same function.

## Required Input

```text
Episode video path:
Frame folder or manifest from Step 01:
Step 01 evidence JSONL or SQLite:
Step 01 validation report:
Step 01 dialogue/audio event/speaker ledgers:
Step 02 no-OCR audio semantic dialogue ledger, when OCR is skipped:
Step 01 minute chunk manifests, if used:
Episode ID:
Optional web/source script links or search notes:
```

## Procedure

1. Confirm Step 01 validation report exists and `ok=true`; if not, stop and rerun/fix Step 01.
2. Match every extracted frame back to the source video using `scripts/match_frames_to_video.py`.
3. Use the sorted `timecode` mapping and evidence JSONL/SQLite, not filename order alone.
4. For dialogue reconstruction, do not rely on shot `start / mid / end` frames alone. Run dense subtitle/dialogue frame sampling at 0.1-0.2 second intervals for dialogue-active windows, especially the first seconds of an episode, fast one-word subtitles, interruptions, reaction beats, and cut points. Save these dense frames separately from the normal shot-level visual supplement.
5. Check whether the source video or player displays subtitles that are not present in native extracted PNG frames. Probe subtitle streams and companion subtitle files when possible; if the player renders `soft` subtitles, extract or render that subtitle layer before final dialogue reconstruction. Do not treat native-frame OCR as complete when player screenshots show additional subtitles.
6. Run ASR before rebuilding dialogue. For the current project, the default no-OCR dialogue ledger starts from Step 01 `Qwen3-ASR-1.7B + Qwen3-ForcedAligner-0.6B` outputs: `EPXXX_transcript.srt`, `EPXXX_transcript_segments.csv/json`, and `EPXXX_qwen3_asr_dialogue_ledger.csv/json` when available. Save raw JSON/SRT/CSV outputs and a clean dialogue candidate ledger before writing the timeline. If Qwen3 is unavailable, times out, or fails, use the recorded ASR blocker plus fallback ASR/VAD/audio-event evidence; do not silently treat legacy ASR outputs as the default truth.
7. When OCR is absent, skipped, empty, or not worth waiting for, run `scripts/build_audio_semantic_dialogue.py` against the Step 01 Qwen3 transcript/dialogue ledger first, with fallback transcript ledgers only as secondary candidates. Use its CSV/JSON/MD as the dialogue candidate base, then perform human semantic cleanup from native frames/audio context. Optional correction JSON and speaker-map JSON may be used for episode-specific names, institutions, and speaker ranges.
8. Run `scripts/smart_selective_ocr.py --engine baidu-api` after the audio semantic dialogue ledger for the current template when subtitle/text QA is needed. The script selects only high-value frames around medium/low ASR confidence, semantic variants, names, institutions, amounts, short subtitles, onscreen comments, screen/data panels, phone screens, and timeline rows mentioning readable text. User-flagged screenshots/time ranges always trigger targeted API OCR. Use `BAIDU_OCR_ACCESS_TOKEN` or `BAIDU_OCR_API_KEY + BAIDU_OCR_SECRET_KEY`; do not store tokens in the skill or generated artifacts.
9. Build or load `EPXXX_dialogue_alignment_ledger.csv/json` before writing the delivered timeline. This ledger should merge Qwen3/ForcedAligner segment time ranges, smart-OCR subtitle/text rows, dense subtitle-frame windows, shot ranges, speaker-attribution status, and uncertainty notes.
10. Merge evidence by shot/time: dense subtitle frames, Baidu smart-OCR subtitle/text windows, extracted/player-rendered subtitle tracks, Qwen3-ASR/ForcedAligner timestamped transcript, manual/native-frame subtitle review, fallback ASR comparisons, the audio semantic dialogue ledger, dialogue/performance/emotion ledgers, TransNetV2/OpenCV shot ids, and any reliable web/script information.
11. Resolve exact wording as `user-provided key information / verified visible text or subtitle / manual frame review > smart OCR with frame/time evidence > Qwen3-ASR + ForcedAligner timestamped transcript > fallback ASR comparison > visual inference`. For the current project, missing full OCR does not block Step 02; preserve ASR-only spoken lines as candidates, but names, numbers, brands, and screen text must be resolved by OCR/manual frame review or kept in internal blocker sidecars instead of being delivered as uncertain final text.
12. Start the delivered timeline from the shot list. Inspect each shot's native frame or shot-level start/mid/end supplement, then assign a short story-function label in `剧情段`.
13. Build story beats by plot function and scene blocking, but do not collapse different camera angles, reaction shots, prop close-ups, readable text inserts, entrances/exits, or transition effects into one row just because they belong to the same story beat.
14. For every minute chunk, summarize the dramatic action, dialogue/audio rhythm, and key assets that appear or change inside that minute.
15. Keep uncertain dialogue, offscreen voice, emotion, or identity in internal candidate ledgers or blocker notes instead of inventing. Do not pass `未知/待确认` or equivalent labels into the delivered Step02 table or Step02 -> Step03 handoff.

## Dialogue Alignment QA

Before finalizing Step 02, run these checks:

- If `EPXXX_transcript_segments.csv`, `EPXXX_audio_semantic_dialogue_ledger.csv`, or another ASR/dialogue ledger has meaningful spoken lines, the delivered Step 02 Word/MD/JSON must map those lines into shot rows and `原片对白顺序`. A build where most rows say `无明确对白` while ASR has real dialogue is a hard failure, not a draft to package.
- Delivered Step 02 rows must translate frame/audio evidence into visible facts. Do not write placeholder wording such as `本镜头 Step01 有 X 张原始证据帧`, `以抽帧为准`, `以原片 native frame 为准`, or `看抽帧`; describe the actual people, blocking, props, screens, light, and action instead.
- Long ASR segments must not be copied into every shot they overlap. If a line spans more than one shot, use smart OCR, dense frames, mouth movement, and cut timing to decide the actual subtitle/speech interval. If unresolved, write the line only where evidence is strongest in the internal candidate ledger and block downstream handoff until the delivered row has a concrete speaker/time binding.
- Short ASR candidates must be checked by their own time range, not by text alone. A single Chinese character or semantically incomplete fragment is a subtitle/OCR/ASR candidate, not deliverable dialogue. Extract dense frames around that `start/end` window; only a confirmed complete line with speaker and meaning may enter the user-facing Word and downstream handoff. Otherwise record it in a rejected-candidates sidecar with the checked frame range.
- Repeated identical dialogue across adjacent shots is suspicious. Keep repetition only when the video visibly repeats the subtitle/audio; otherwise convert the extra rows to `无新增对白 / 前句情绪延续` or record a dialogue-resolution blocker outside the production handoff.
- Every VAD/ASR speech window must map to one of: confirmed dialogue, background/ambient office speech, offscreen voice, hearing unclear, or ASR hallucination/low confidence. Do not leave speech windows silently unrepresented.
- Every smart-OCR subtitle row must appear in `原片对白顺序` unless it is rejected as low-confidence OCR noise, in which case record the rejection in the alignment ledger.
- Every dialogue row needs a speaker-attribution status: `onscreen_mouth`, `offscreen_voice`, `subtitle_only`, `asr_only`, `background_voice`, or `pending`. Do not assign a line to the main character only because the shot row is visually centered on that character.
- User-flagged screenshots or time ranges override the default no-OCR path. Re-open the relevant video window, extract dense frames, OCR/manual-read the subtitle, and patch the timeline rows and dialogue order.

## Evidence Writing Rules

- Write visible facts: material, light source direction, color temperature, spatial layers, body position, hand position, prop state, text on screen, camera distance.
- For each beat, analyze role positioning: who is left/right/foreground/background, sitting/standing, facing direction, distance between characters, entry/exit path, and whether an object or person blocks the view.
- For each shot row, name the shot function: speaker close-up, listener reaction, over-shoulder reverse, group wide, prop close-up, text/screen insert, action continuation, or transition. This prevents a dialogue-dense episode from being compressed into a few broad plot rows.
- For each shot row, write dialogue/performance facts when present: speaking character, offscreen voice, breath, silence, laugh/cry/gasp, hesitation, and emotional turn. Use audio ledgers as candidates and verify against frames/video when possible. Do not carry forward post-added sound effects, audio peaks, music hits, or background music.
- Track key assets as they appear in time: characters, wardrobe, rooms, vehicles, phones, documents, jewelry, gifts, wounds, screens, signs, text props, and any item that must later become a character/scene/prop/text-screen prompt.
- Use fewer vague adjectives. Replace "高级、电影感、真实、压抑" with observable details.
- Preserve continuity: clothing, hair, phone state, documents, jewelry, flowers, cups, injuries, screen direction, light direction.
- Use evidence frame filenames/timecodes internally while writing. Do not include a separate `抽帧证据` column or frame filename list in the delivered output unless the user explicitly asks.
- Hard-subtitle dialogue must be restored line by line when available, but for the current project do not wait for OCR. Use ASR/semantic dialogue line by line as candidates, then resolve wording, speaker, name, amount, brand, and screen text before downstream handoff. If user-provided key information or manual frame review later corrects a line, that correction overrides ASR.
- Player-visible subtitle dialogue must also be restored line by line, even when the subtitle is a soft/player-rendered layer absent from native extracted PNGs. If the user's player screenshot shows a subtitle such as an opening one-word line, include it in `原对白还原` and `原片对白顺序` with its observed timecode instead of dropping it as OCR-missing.
- Short subtitles can appear and disappear between shot-level `start / mid / end` frames. When ASR or user review suggests a missing short line, create a dense frame strip around that time range before deciding the line is absent.
- Before writing the delivered timeline, create a no-OCR dialogue candidate ledger from available ASR and semantic cleanup first, then reconcile it line by line against manual frame review and any user-provided key information. Dialogue completeness outranks compactness, but unresolved candidate-state labels stay in sidecars or blockers; the handoff rows must contain concrete speaker-owned lines or explicit no-dialogue beats.
- If a dialogue line has no OCR support, keep the ASR basis in the internal ledger and still resolve the delivered `原对白还原` / `原片对白顺序` line by speaker, timing, and meaning before Step 03. Do not add a separate technical QA section by default.
- Do not use contact sheets as visual evidence; use native-resolution PNGs or TransNetV2 shot keyframes.

## No-OCR Dialogue Command

```powershell
& "C:\Users\lsb\anaconda3\envs\shortdrama_hq310\python.exe" <skill_dir>\scripts\build_audio_semantic_dialogue.py `
  --episode-id "EP001" `
  --step01-dir "D:\path\mx_redraw_step01\EP001_frames" `
  --out-dir "D:\path\mx_redraw_step02\EP001_source_timeline"
```

Optional correction files:

- `--corrections-json`: episode-specific replacement rules and line overrides for names, brands, amounts, and idioms.
- `--speaker-map-json`: time-range or token-conditioned speaker labels. When absent and speaker ownership cannot be inferred from voice, mouth movement, adjacent reverse shots, relationship logic, and dialogue meaning, record a blocker instead of inventing speaker identity or passing an unresolved label downstream.

Default outputs:

- `EPXXX_audio_semantic_dialogue_ledger.csv`
- `EPXXX_audio_semantic_dialogue_ledger.json`
- `EPXXX_audio_semantic_dialogue_test.md`

## Smart OCR Command

Use this after the audio semantic ledger exists and before finalizing/revising the Step02 timeline when exact text risk remains:

Current-template default: run this before final Step 02 delivery with Baidu OCR API when exact subtitle or visible text QA is needed. If it finds corrected dialogue or visible text, patch the timeline and regenerate the Word output; do not leave the API OCR result only in `smart_ocr*/`.

```powershell
$env:BAIDU_OCR_API_KEY = "<runtime api key>"
$env:BAIDU_OCR_SECRET_KEY = "<runtime secret key>"
& "C:\Users\lsb\anaconda3\envs\shortdrama_hq310\python.exe" <skill_dir>\scripts\smart_selective_ocr.py `
  --episode-id "EP001" `
  --step01-dir "D:\path\mx_redraw_step01\EP001_frames" `
  --step02-dir "D:\path\mx_redraw_step02\EP001_source_timeline" `
  --engine baidu-api `
  --max-total-frames 35 `
  --max-frames-per-line 1
```

Do not store the API token in the skill or generated outputs. The script reads `BAIDU_OCR_ACCESS_TOKEN` first, then `BAIDU_OCR_API_KEY + BAIDU_OCR_SECRET_KEY`.

Smart OCR outputs:

- `smart_ocr*/EPXXX_smart_ocr_candidates.csv/json`
- `smart_ocr*/EPXXX_smart_ocr_ledger.csv/json`
- `smart_ocr*/EPXXX_smart_ocr_dialogue_reconcile.csv/json`
- `smart_ocr*/EPXXX_smart_ocr_summary.md`

## Required Output

```markdown
# EPXXX 原片镜头时间轴（校对参考）

## 核心逻辑

## 原片镜头时间轴
| Shot | 时间码 | 剧情段 | 原片画面/构图 | 角色站位/动线 | 原对白还原 | 剧情功能与复刻重点 |
| --- | --- | --- | --- | --- | --- | --- |

## 每分钟剧情分镜头精细时刻表
| 分钟 | Shot范围 | 剧情进展 | 关键画面/动作 | 对白/表演情绪 | 本分钟关键资产 | 给Step04的提示词重点 |
| --- | --- | --- | --- | --- | --- | --- |

## 关键资产初表（校对参考）
| Asset候选 | 类型 | 首次出现时间码 | 出现/变化镜头 | 视觉身份 | 剧情功能 | 后续用途 |
| --- | --- | --- | --- | --- | --- | --- |

## 原片对白顺序
- `时间码 说话人：原对白`

## 关键构图与连续性
```

Do not output `技术校核摘要` or `高质量工具校验摘要` by default.
Do not produce Mexican Spanish dialogue in this step. Pass the completed original timeline to `$mx-shortdrama-03-mexico-localize`.

Reject and revise any source timeline that summarizes a normal short-drama episode into only a handful of large beats while the shot list contains many distinct cuts. If an episode has 70+ detected shots, the accepted timeline should normally have a comparable number of rows, except for clearly duplicate transition tails or visually identical repeated frames.

For table detail, read `references/source-timeline-schema.md`.
